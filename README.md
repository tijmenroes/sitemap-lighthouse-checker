### Sitemap lighthouse checker

Check an entire sitemap and use lighthouse to get a summary of your entire site.

### Setup

```
npm i -g lighthouse
```

Install lighthouse globally so you can use the CLI.

```
npm i
```

Install all packages needed for this project

Then copy `.env.example` to `.env` and fill the variables.

```
node script.js
```

This will run the script to get all lighthouse scores, and create a summary in the folder `/summary`

### Output

An example output of this can be found in the source code `example-summary.json`.
First you see a summary of the scores, based on all lighthouse options.
Then you see the pages with the scores ascending, so the pages that need the most optimization will be shown first.

```
  "summary": {
    "total": 0.89,
    "scores": [
      {
        "title": "Performance",
        "score": 0.96
      },
      {
        "title": "Accessibility",
        "score": 0.74
      },
      {
        "title": "Best Practices",
        "score": 0.94
      },
      {
        "title": "SEO",
        "score": 0.89
      }
    ]
  },
```
