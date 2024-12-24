import fs from "fs";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { Worker } from "worker_threads";
import dotenv from "dotenv";

(async () => {
  dotenv.config();
  cleanUpReports();
  const sitemapUrl = process.env.SITEMAP_URL;
  const urls = await getSitemapUrls(sitemapUrl);

  const arr = urls.splice(0, 12);

  const urlList = arr.map((url) => {
    return {
      fileUrl: url.replace(/(^\w+:|^)\/\//, "").replace(/\//g, "-"),
      url,
    };
  });

  gatherLighthouseScores(urlList);
})();

async function getSitemapUrls(sitemapUrl) {
  try {
    const response = await axios.get(sitemapUrl);
    const sitemapXml = response.data;

    const result = await parseStringPromise(sitemapXml);
    const urls = result.urlset.url.map((entry) => entry.loc[0]);

    return urls;
  } catch (error) {
    console.error("Error fetching or parsing the sitemap:", error.message);
    return [];
  }
}

function gatherLighthouseScores(urlList) {
  console.time("lighthouse");
  const batchSize = 3;
  const numWorkers = 4;
  let batchIndex = 0;

  const workers = [];
  const workerStatus = new Array(numWorkers).fill(false);

  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker("./worker.js");
    worker.on("message", (message) => handleWorkerMessage(message, i));
    worker.on("error", (error) => {
      handleWorkerMessage({ type: "error", error: error.message }, i);
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Worker ${i} stopped with exit code ${code}`);
      }
    });
    workers.push(worker);
  }

  function handleWorkerMessage(message, workerIndex) {
    if (message.type === "batch-completed") {
      console.log(`Worker ${workerIndex} completed a batch.`);
      workerStatus[workerIndex] = false;
      assignBatch(workerIndex);
    } else if (message.type === "error") {
      console.error(`Error from worker ${workerIndex}: ${message.error}`);
      workerStatus[workerIndex] = false;
      assignBatch(workerIndex);
    }
  }

  function assignBatch(workerIndex) {
    console.log(`Assigning batch to worker ${workerIndex}`);
    if (batchIndex >= urlList.length) {
      console.timeEnd("lighthouse");
      getScores(urlList);
      // No more batches to process
      if (!workerStatus.includes(true)) {
        console.log("All workers are idle. Tasks completed.");
        terminateWorkers();
      }
      return;
    }

    const batch = urlList.slice(batchIndex, batchIndex + batchSize);
    console.log(
      `Assigning batch ${batchIndex + 1} - ${batchIndex + batch.length} of ${
        urlList.length
      } to worker ${workerIndex}`
    );

    batchIndex += batchSize;
    workerStatus[workerIndex] = true;
    workers[workerIndex].postMessage({ type: "run-lighthouse-batch", batch });
  }

  function terminateWorkers() {
    workers.forEach((worker) => worker.terminate());
  }

  for (let i = 0; i < numWorkers; i++) {
    assignBatch(i);
  }
}

function cleanUpReports() {
  console.log("Cleaning up directories");
  const dirs = ["./reports", "./summary"];
  dirs.forEach((dir) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.error("Error reading reports directory:", err);
        return;
      }

      files.forEach((file) => {
        fs.unlink(`./${dir}/${file}`, (err) => {
          if (err) {
            console.error(`Error deleting file: ${file}`, err);
          }
        });
      });
    });
  });
}

function getScores(urlList) {
  const totalUrlScores = [];
  const errorList = [];
  urlList.forEach((url) => {
    getUrlScore(url);
  });
  summarizeScores();

  function getUrlScore(url) {
    try {
      const fileUrl = url.fileUrl;
      const report = JSON.parse(
        fs.readFileSync(`./reports/${fileUrl}.json`, "utf8", (err, data) => {
          if (err) {
            console.log("Error reading file:", fileUrl);
            console.error(err);
            return;
          }
          console.log(data);
        })
      );

      if (!report) {
        console.log("No file found for", fileUrl);
        errorList.push({
          url: url.url,
          error: "No categories found",
        });
        return;
      }
      if (report.runtimeError) {
        errorList.push({
          url: url.url,
          error: report.runtimeError.message,
        });
        return;
      }

      const summaryItem = {
        url: fileUrl,
        avgScore: 0,
        scores: [],
      };
      const categories = report.categories;

      Object.values(categories).forEach((category) => {
        const score = {
          id: category.id,
          title: category.title,
          score: category.score,
          details: category.auditRefs
            .filter((audit) => audit.weight > 0)
            .reduce((result, audit) => {
              result[audit.id] = formatScore(report.audits[audit.id].score);
              return result;
            }, {}),
        };
        summaryItem.scores.push(score);
      });

      const avgScore =
        summaryItem.scores.reduce((acc, score) => {
          return acc + score.score;
        }, 0) / summaryItem.scores.length;
      summaryItem.avgScore = formatScore(avgScore);
      totalUrlScores.push(summaryItem);
    } catch (error) {
      console.error("Error reading file:", url.fileUrl);
      console.error(error);
    }
  }

  function summarizeScores() {
    const sorted = totalUrlScores.sort((a, b) => a.avgScore - b.avgScore);
    const summary = {
      total: 0,
      scores: [],
    };

    if (totalUrlScores.length) {
      const total = sorted.reduce((acc, scoreItem) => {
        return acc + scoreItem.avgScore;
      }, 0);

      summary.total = formatScore(total / sorted.length);

      // Should all have same category score ID, kinda unclean though.
      totalUrlScores[0].scores.forEach((score) => {
        const avgCategoryScore =
          totalUrlScores.reduce((acc, scoreItem) => {
            return acc + scoreItem.scores.find((s) => s.id === score.id).score;
          }, 0) / totalUrlScores.length;
        summary.scores.push({
          title: score.title,
          score: formatScore(avgCategoryScore),
        });
      });
    }

    const fullSummary = {
      errorList,
      summary,
      pages: sorted,
    };

    fs.writeFileSync(
      `./summary/summary.json`,
      JSON.stringify(fullSummary, null, 2)
    );
    console.log("Summary written to file");
    process.exit(0);
  }

  function formatScore(score) {
    if (!score) {
      if (typeof score !== "number") {
        console.log("Undefined score found", score);
      }
      return 0;
    }
    return parseFloat(score.toFixed(2));
  }
}
