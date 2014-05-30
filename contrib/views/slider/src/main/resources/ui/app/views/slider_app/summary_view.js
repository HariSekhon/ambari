/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

App.SliderAppSummaryView = Ember.View.extend({

  classNames: ['app_summary'],

  /**
   * List of graphs shown on page
   * Format:
   * <code>
   *   [
   *      {
   *        id: string,
   *        view: App.AppMetricView
   *      },
   *      {
   *        id: string,
   *        view: App.AppMetricView
   *      },
   *      ....
   *   ]
   * </code>
   * @type {{object}[][]}
   */
  graphs: [],

  /**
   * Update <code>graphs</code>-list when <code>model</code> is updated
   * New metrics are pushed to <code>graphs</code> (not set new list to <code>graphs</code>!) to prevent page flickering
   * @method updateGraphs
   */
  updateGraphs: function() {
    var model = this.get('controller.model'),
      existingGraphs = this.get('graphs');
    if (model) {
      var supportedMetrics = model.get('supportedMetricNames');
      if (supportedMetrics && supportedMetrics.length > 0) {
        supportedMetrics.split(',').forEach(function(metricName) {
          if (!existingGraphs.isAny('id', metricName)) {
            var view = App.AppMetricView.extend({
              app: model,
              metricName: metricName
            });
            existingGraphs.push({id: metricName, view: view});
          }
        });
      }

      // Delete not existed graphs
      var toDeleteGraphs = [];
      existingGraphs.forEach(function(existingGraph) {
        if (supportedMetrics.indexOf(existingGraph) == -1) {
          toDeleteGraphs.push(existingGraph);
        }
      });
      toDeleteGraphs.forEach(function(toDeleteGraph) {
        existingGraphs = existingGraphs.without(toDeleteGraph);
      });
    }
  }.observes('controller.model.supportedMetricNames')
});
