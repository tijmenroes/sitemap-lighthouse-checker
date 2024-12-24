
import { parentPort } from 'worker_threads';
import { exec } from 'child_process';

parentPort.on('message', (message) => {
  if (message.type === 'run-lighthouse-batch') {
    const batch = message.batch;

    const promises = batch.map((url) => {
      return new Promise((resolve, reject) => {
        console.log(`Running Lighthouse for ${url.url}`);
        exec(
          `lighthouse ${url.url} --output json --output-path ./reports/${url.fileUrl}.json --config-path=lighthouse.config.js --chrome-flags="--headless"`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error running Lighthouse for ${url.url}`);
              reject(error);
            } else {
              console.log(`Completed Lighthouse for ${url.url}`);
              resolve();
            }
          }
        );
      });
    });

    Promise.all(promises)
      .then(() => {
        parentPort.postMessage({ type: 'batch-completed' });
      })
      .catch((error) => {
        parentPort.postMessage({ type: 'error', error: error.message });
      });
  }
});
