
import { exec } from 'child_process';

const url = {
    url: 'https://example.com',
    fileUrl: 'example-com',
}
        exec(
          `lighthouse ${url.url} --output json --output-path ./reports/${url.fileUrl}.json --config-path=lighthouse.config.js --chrome-flags="--headless"`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error running Lighthouse for ${url.url}`);
              reject(error);
            } else {
              console.log(`Completed Lighthouse for ${url.url}`);
            }
          }
        );