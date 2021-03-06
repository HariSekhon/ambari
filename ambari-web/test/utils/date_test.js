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

var Ember = require('ember');
var App = require('app');

var validator = require('utils/validator');
var date = require('utils/date');

describe('date', function () {

  var correct_tests = Em.A([
    {t: 1349752195000, e: 'Tue, Oct 09, 2012 03:09', e2: 'Tue Oct 09 2012'},
    {t: 1367752195000, e: 'Sun, May 05, 2013 11:09', e2: 'Sun May 05 2013'},
    {t: 1369952195000, e: 'Thu, May 30, 2013 22:16', e2: 'Thu May 30 2013'},
    {t: 1369952195000, e: 'Thu, May 30, 2013 22:16:35', e2: 'Thu May 30 2013', showSeconds: true },
    {t: 1369952195000, e: 'Thu, May 30, 2013 22:16:35:000', e2: 'Thu May 30 2013', showSeconds: true, showMilliseconds: true }
  ]);

  var incorrect_tests = Em.A([
    {t: null},
    {t: ''},
    {t: false},
    {t: []},
    {t: {}},
    {t: undefined},
    {t: function(){}}
  ]);

  describe('#dateFormatZeroFirst()', function() {
    var tests = [
      {
        t: 2,
        e: '02',
        m: 'should convert to `02`'
      },
      {
        t: 10,
        e: '10',
        m: 'should convert to `10`'
      }
    ];
    tests.forEach(function(test) {
      it(test.m, function() {
        expect(date.dateFormatZeroFirst(test.t)).to.eql(test.e);
      });
    });
  });

  describe('#dateFormat', function() {
    describe('Correct timestamps', function(){
      correct_tests.forEach(function(test) {
        var testMessage = test.t + ' `showSeconds` ' + !!test.showSeconds + '`showMilliseconds` ' + !!test.showMilliseconds;
        it(testMessage, function() {
          expect(date.dateFormat(test.t, test.showSeconds, test.showMilliseconds)).to.equal(test.e);
        });
      });
    });
    describe('Incorrect timestamps', function() {
      incorrect_tests.forEach(function(test) {
        it(test.t, function() {
          expect(date.dateFormat(test.t)).to.equal(test.t);
        });
      });
    });
  });

  describe('#dateFormatShort', function() {
    describe('Correct timestamps', function() {
      correct_tests.forEach(function(test) {
        it(test.t, function() {
          expect(date.dateFormatShort(test.t)).to.equal(test.e2);
        });
      });
    });
    it('Today timestamp', function() {
      var now = new Date();
      var then = new Date(now.getFullYear(),now.getUTCMonth(),now.getUTCDate(),0,0,0);
      expect(date.dateFormatShort(then.getTime() + 10*3600*1000)).to.equal('Today 10:00:00');
    });
    describe('Incorrect timestamps', function() {
      incorrect_tests.forEach(function(test) {
        it(test.t, function() {
          expect(date.dateFormatShort(test.t)).to.equal(test.t);
        });
      });
    });
  });

  describe('#startTime()', function() {
    var today = new Date();
    var tests = [
      { t: 1349752195000, e: 'Tue Oct 09 2012 06:09' },
      { t: -10000000, e: 'Not started' },
      { t: today.getTime(), e: 'Today {0}:{1}'.format(date.dateFormatZeroFirst(today.getHours()), date.dateFormatZeroFirst(today.getMinutes())) },
      { t: today, e: ''}
    ];
    tests.forEach(function(test) {
      var testMessage = 'should conver {0} to {1}'.format(test.t, test.e);
      it(testMessage, function() {
        expect(date.startTime(test.t)).to.be.eql(test.e);
      });
    });
  });

  describe('#timingFormat', function() {
    var tests = Em.A([
      {i: '30', e:'30 ms'},
      {i: '300', e:'300 ms'},
      {i: '999', e:'999 ms'},
      {i: '1000', e:'1.00 secs'},
      {i: '3000', e:'3.00 secs'},
      {i: '35000', e:'35.00 secs'},
      {i: '350000', e:'350.00 secs'},
      {i: '999999', e:'1000.00 secs'},
      {i: '1000000', e:'16.67 mins'},
      {i: '3500000', e:'58.33 mins'},
      {i: '35000000', e:'9.72 hours'},
      {i: '350000000', e:'4.05 days'},
      {i: '3500000000', e:'40.51 days'},
      {i: '35000000000', e:'405.09 days'}
    ]);

    describe('Correct data', function(){
      tests.forEach(function(test) {
        it(test.t, function() {
          expect(date.timingFormat(test.i)).to.equal(test.e);
        });
      });
    });

    describe('Incorrect data', function(){
      incorrect_tests.forEach(function(test) {
        it(test.t, function() {
          expect(date.timingFormat(test.t)).to.equal(null);
        });
      });
    });

  });

  describe('#duration', function() {
    var tests = Em.A([
      {startTime: 1, endTime: 2, e: 1},
      {startTime: 0, endTime: 2000, e: 0},
      {startTime: 200, endTime: 0, e: 19800}
    ]);

    beforeEach(function() {
      sinon.stub(App, 'dateTime', function () { return 20000; });
    });

    tests.forEach(function(test) {
      it(test.startTime + ' ' + test.endTime, function() {
        expect(date.duration(test.startTime, test.endTime)).to.equal(test.e);
      });
    });

    afterEach(function() {
      App.dateTime.restore();
    });
  });

  describe('#durationSummary()', function() {
    var tests = [
      {
        startTimestamp: 1349752195000,
        endTimestamp: 1349752199000,
        e: '4.00 secs'
      },
      {
        startTimestamp: 1349752195000,
        endTimestamp: 1367752195000,
        e: '208.33 days'
      },
      {
        startTimestamp: -10000000,
        endTimestamp: 1367752195000,
        e: Em.I18n.t('common.na')
      },
      {
        startTimestamp: 1349752195000,
        endTimestamp: -1,
        stubbed: true,
        e: '0 secs'
      },
      {
        startTimestamp: 1000,
        endTimestamp: -1,
        stubbed: true,
        e: '19.00 secs'
      }
    ];

    beforeEach(function() {
      sinon.stub(App, 'dateTime', function () { return 20000; });
    });

    tests.forEach(function(test) {
      var testMessage = 'duration between {0} and {1} is {2}'.format(test.startTimestamp, test.endTimestamp, test.e) + (test.stubbed ? " App.dateTime() is stubbed" : "");
      it(testMessage, function() {
        expect(date.durationSummary(test.startTimestamp, test.endTimestamp)).to.be.eql(test.e);
      });
    });

    afterEach(function() {
      App.dateTime.restore();
    });
  });

});