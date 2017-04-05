/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const constants = require('./constants');
const utils = require('./utils');
const Metrics = require('../lighthouse-core/lib/traces/pwmetrics-events');

const GENERATED_RESULTS_PATH = path.resolve(constants.OUT_PATH, 'generatedResults.js');
const LIGHTHOUSE_REPORT_FILENAME = 'lighthouse.json';

function main() {
  const allResults = [];
  fs.readdirSync(constants.OUT_PATH).forEach(siteDir => {
    const sitePath = path.resolve(constants.OUT_PATH, siteDir);
    if (!utils.isDir(sitePath)) {
      return;
    }
    allResults.push({site: siteDir, results: analyzeSite(sitePath)});
  });
  const formattedResults = formatResults(allResults);
  fs.writeFileSync(
    GENERATED_RESULTS_PATH,
    `var generatedResults = ${JSON.stringify(formattedResults)}`
  );
}

main();

/**
 * @param {string} sitePath
 * @return {!RunResults}
 */
function analyzeSite(sitePath) {
  console.log('Analyzing', sitePath); // eslint-disable-line no-console
  const runResults = [];
  fs.readdirSync(sitePath).forEach(runDir => {
    const lighthouseReportPath = path.resolve(sitePath, runDir, LIGHTHOUSE_REPORT_FILENAME);
    if (!utils.isFile(lighthouseReportPath)) {
      return;
    }
    const metrics = readResult(lighthouseReportPath);
    console.log(`Metric for ${runDir}: ${JSON.stringify(metrics)}`); // eslint-disable-line no-console
    runResults[runDir] = {
      runId: runDir,
      metrics
    };
  });
  return runResults;
}

/**
 * @param {string} resultPath
 * @return {!Array<!Metric>}
 */
function readResult(lighthouseReportPath) {
  const data = JSON.parse(fs.readFileSync(lighthouseReportPath));
  return Metrics.metricsDefinitions.map(metric => ({
    name: metric.name,
    id: metric.id,
    timing: metric.getTiming(data.audits)
  }));
}

/**
 * @param {!Array<!SiteResults>} results
 * @return {!FormattedResults}
 */
function formatResults(results) {
  return Metrics.metricsDefinitions.map(metric => metric.name).reduce((acc, metricName, index) => {
    acc[metricName] = results.map(siteResult => ({
      site: siteResult.site,
      metrics: siteResult.results.map(runResult => ({
        timing: runResult.metrics[index].timing
      }))
    }));
    return acc;
  }, {});
}

/**
 * @typedef {{site: string, results: !RunResults}}
 */
let SiteResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {Array<{runId: string, metrics: !Array<!Metric>}>}
 */
let RunResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {{name: string, id: string, timing: number}}
 */
let Metric; // eslint-disable-line no-unused-vars

/**
 * @typedef {Object<string, !Array<{site: string, metrics: !Array<!{timing: string}>}>}
 */
let FormattedResults; // eslint-disable-line no-unused-vars