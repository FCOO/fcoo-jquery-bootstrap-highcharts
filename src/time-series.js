/****************************************************************************
time-series.js

A time-serie chart can by type 1: or 2:

1. Data from a single parameter from one location. Ea. sealevel at Drogden
title       : Location name
sub-title   : Parameter name and unit
legend      : none

2: Data from a single parameter from two or more locations. Ea. Sea Level from 3 different stations
title       : parameter name
sub-title   : none
legend      : horizontal below title
plot-band   : optional. Get the band from a scale (to be coded)

3: Data from multi parameters from a single location. Ea. Wind speed and Temperature (Air) from on station
title       : Location-name
sub-title   : none
legend      : horizontal below title
axis        : Each parameter get own y-axis in own color

****************************************************************************/

(function ($, Highcharts, i18next, moment, window/*, document, undefined*/) {
	"use strict";

	//Create fcoo-namespace
    var ns = window.fcoo = window.fcoo || {},
        nsHC = ns.hc = ns.highcharts = ns.highcharts || {};

    //Linkedin Extended Palette for Screen
    var linkedinPalette = [
        //0:Blue    1:Purple    2:Red      3:Orange   4:Cyan     5:Yellow   6:Pink     7:Green    8:Gray
        ['#CFEDFB', '#EBE4FF', '#FFE0DA', '#FFE7BB', '#D2ECEB', '#FFF2B6', '#FFDFF2', '#E0F4BE', '#E6E9EC'],
        ['#9BDAF3', '#D8CCF4', '#FAC2BB', '#F8CD94', '#9EDDDD', '#FBE491', '#FFC4E4', '#C7E59A', '#D0D3D6'],
        ['#68C7EC', '#BFABE6', '#F59890', '#F7B26A', '#69CDCF', '#F7D56B', '#F99ACA', '#AED677', '#B6B9BC'],
        ['#34B3E4', '#A589D9', '#F16D64', '#F59640', '#35BEC1', '#F3C746', '#F371AF', '#95C753', '#A0A3A6'],
        ['#00A0DC', '#8C68CB', '#EC4339', '#F47B16', '#00AEB3', '#EFB920', '#ED4795', '#7CB82F', '#86898C'],
        ['#008CC9', '#7C5BBB', '#DD2E1F', '#EC640C', '#009EA5', '#E6A700', '#E2247F', '#60AA14', '#737679'],
        ['#0077B5', '#6A4BA7', '#C11F1D', '#CD5308', '#008891', '#CA9400', '#C9186E', '#4E8F13', '#595C5F'],
        ['#005E93', '#573B93', '#A40F1C', '#AF4104', '#00727D', '#AA7D00', '#B10C5C', '#3B7511', '#434649'],
        ['#004471', '#452B7F', '#88001A', '#903000', '#005C69', '#8B6700', '#870044', '#295A10', '#303336']
    ];
//Default color: index 4

    var colorList = linkedinPalette[4];

    //Set color sequence = Blue, Red, Green, Yellow, Gray,  Purple, Pink, Cyan, Orange
    Highcharts.setOptions({
        colors: [
            colorList[0],
            colorList[2],
            colorList[7],
            colorList[5],
            colorList[8],
            colorList[1],
            colorList[6],
            colorList[4],
            colorList[3]
        ]
    });


    /*********************************************************
    Extend Point with method to format any value
    *********************************************************/
    Highcharts.Point.prototype.formatValue = function (value) {
        var saveY = this.y;
        this.y = value;
        var result = this.tooltipFormatter('{point.y}');
        this.y = saveY;
        return result;
    };

    /****************************************************************************
    Extend Point.tooltipFormatter to also translate other options
    ****************************************************************************/
    var translateSeriesOptions = ['nameInTooltip'];
    Highcharts.Point.prototype.tooltipFormatter = function (tooltipFormatter) {
        return function(){
            var opt = this.series.options;
            $.each(translateSeriesOptions, function(index, id){
                var id_i18next = id+'i18next';
                if (!opt[id]) return;

                if ($.type(opt[id]) == "object")
                    opt[id_i18next] = opt[id];
                opt[id] = opt[id_i18next] ? i18next.sentence(opt[id_i18next]) : opt[id];
            });
            return tooltipFormatter.apply(this, arguments);
        };
    }(Highcharts.Point.prototype.tooltipFormatter);



    /****************************************************************************
    convert-function.
    Every timeSeriesData (see below) must provide a convert-function that receive
    the data read from a data-file or the data given directly to the TimeSerieData-constructor
    and return a object or array with info regarding series-data etc.:
    Variation 1:
    {
        data         : []point-value OR [][point-value#0,...,point-value#N]
        pointStart   : Moment or Date or DATESTRING
        pointInterval: INTEGER Milliseconds
        OR
        pointIntervalUnit: STRING. "day", "month" or "year"
    }

    Variation 2
    {
        data: [][time-stamp, point-value#0,...,point-value#N]
    }

    Variation 3
    [][time-stamp, point-value#0,...,point-value#N]


    standardConvert
    ****************************************************************************/
    function standardConvert(data/*, timeSeriesData*/){
        return {
            data         : data.data || this.data,
            pointStart   : data.start || data.pointStart || this.start,
            pointInterval: data.interval || data.pointInterval || this.interval
        };
    }

    /****************************************************************************
    timeSeriesData: A object used to load data for a single time-serie or time-range-serie
    and convert in into the right HC-format

    options:
        start   : STRING. Moment-string
        interval: STRING. Moment-duration
        data    : []FLOAT
    or
        fileName: STRING or {mainDir:STRING|BOOLEAN, subDirName:STRING, fileName:STRING} See fcoo-data-files
        convert : FUNCTION(data, timeSeriesData): Convert data into the correct format in TimeSeriesData

    ****************************************************************************/
    var TimeSeriesData = function(options){
        this.start      = options.start || null;
        this.interval   = options.interval || null;
        this.data       = options.data || null;

        this.fileName   = options.fileName || null;
        this.convert    = options.convert || standardConvert;
    };

    TimeSeriesData.prototype = {
        promiseListOptions: function(){
            return {
                fileName: this.fileName ? ns.path.dataFileName(this.fileName) : null,
                data    : this.data,
                resolve : $.proxy(this.resolve, this)
            };
        },

        //Update the chart with the info returned from the convert-function
        resolve: function(data){
            var seriesOptions = {},
                options = this.convert(data, this);

            if (options.pointStart){
                //Variation 1
                var pointInterval = options.pointInterval;
                if (pointInterval && (typeof pointInterval == 'string'))
                    pointInterval = moment.duration(pointInterval).milliseconds();

                seriesOptions = {
                    pointStart       : moment(options.pointStart).valueOf(),
                    pointInterval    : pointInterval,
                    pointIntervalUnit: options.pointIntervalUnit || null,
                };
            }

            if (options.data)
                //Variation 2
                seriesOptions.data = options.data;
            else
                //Variation 3
               seriesOptions.data = options;


            this.series.update(seriesOptions, false);
        }
    };


    /****************************************************************************
    BaseTimeSeries
    Base constructor for time-series charts
    options = {
        container
        parameter   : []Parameter or Parameter
        location    : []Location Or Location
        data        : []TimeSeriesDataOptions or TimeSeriesDataOptions
        chartOptions: JSON
        finally     : function(timeSeries) (optional) Called when all data are loaded.
                        Used when eg. not all data-source need there own series but need to be combined
    }
    ****************************************************************************/
    function BaseTimeSeries(options){
        var _this = this;

        this.chartOptions = options.chartOptions || {};

        this.chartConstructor = nsHC.chart;
        this.options = options;
        this.finally = options.finally || function(){};

        this.parameter = $.isArray(options.parameter) ? options.parameter : [options.parameter];
        $.each(this.parameter, function(index, param){ _this.parameter[index] = ns.parameter.getParameter(param); });
        this.multiParameter = this.parameter.length > 1;

        this.location  = $.isArray(options.location)  ? options.location  : [options.location];
        this.locationName = [];
        $.each(this.location, function(index, loc){ _this.locationName[index] = $._bsAdjustIconAndText(loc).text; });
        this.multiLocation = this.location.length > 1;

        this.singleSingle = !this.multiParameter && !this.multiLocation;

        this.data  = $.isArray(options.data)  ? options.data : [options.data];
        $.each(this.data, function(index, opt){
            var timeSerieData = new TimeSeriesData(opt);

            timeSerieData.index = index;
            timeSerieData.timeSeries = _this;
            timeSerieData.parameter  = _this.multiParameter ? _this.parameter[index] : _this.parameter[0];
            timeSerieData.location   = _this.multiLocation  ? _this.location[index]  : _this.location[0];

            _this.data[index] = timeSerieData;
        });
    }

    BaseTimeSeries.prototype = {
        //**********************************************
        set: function(path, options){
            path = path.split('.');
            var obj = this.chartOptions,
                id = path.pop();

            for (var i=0; i < path.length; i++) {
                var innerId = path[i];
                if (!obj.hasOwnProperty(innerId))
                    obj[innerId] = {};
                obj = obj[innerId];
            }
            obj[id] = options;
        },


        //**********************************************
        _tooltip_pointFormatter_single: function(timeSeries){
            return  `<tr>
                        <td class="chart-tooltip-value">` +
                            timeSeries.valueFormatter(this)  +
                        `</td>
                    </tr>`;
        },

        _tooltip_pointFormatter_multi: function(timeSeries){
            var serieName = i18next.s( $._bsAdjustText( timeSeries.multiLocation ? this.series.name : this.series.options.nameInTooltip ) );
            return  `<tr>
                        <td class="chart-tooltip-name" style="color:${this.color}">
                            ${serieName}&nbsp;
                        </td>
                        <td class="chart-tooltip-value">` +
                            timeSeries.valueFormatter(this)  +
                        `</td>
                    </tr>`;
        },

        valueFormatter: function(point){
            return '<b>'+point.formatValue(point.y)+'</b>';
        },

        //**********************************************
        _finally: function(){},

        //**********************************************
        createChart: function(){
            var _this = this,
                chartOptions = this.chartOptions;

            //Title
            if (this.multiParameter || this.singleSingle)
                this.set('title.text', this.locationName[0]);
            else
                this.set('title.text', this.parameter[0].decodeGetName(true));

            //Sub-title = paramter-name if only one location and one paramter
            if (this.singleSingle){
                this.set('subtitle', this.parameter[0].hcOptions_axis_title());
                this.set('legend.enabled', false);
            }
            else
                //Legend centered at top
                this.set('legend', {
                    align        : 'center',
                    borderWidth  : 0,
                    enabled      : true,
                    margin       : 0,
                    verticalAlign: 'top'
                });

            //Zoomable
            this.set('chart.zoomType', 'x');

            //x-axis
            this.set('xAxis.crosshair', true);
            this.set('xAxis.type', 'datetime');

            //Default time-step = one hour
            this.set('plotOptions.series.pointInterval', 60*60*1000);

            //Tooltips
            //Set common tooltip for single parameter-mode (in multi-parameter mode the tooltip is set pro series
            chartOptions.tooltip = this.parameter[0].hcOptions_series_tooltip();

            this.set('tooltip.shared', true);
            this.set('tooltip.split', false);

            this.set('tooltip.borderColor', '#868e96'); //Hard-coded from jquery-bootstrap!
            this.set('tooltip.borderRadius', 8);

            this.set('tooltip.headerFormat', '<span class="chart-tooltip-time">{point.key}</span><table class="chart-tooltip-table">');
            if (this.singleSingle){
                //Single location and paramater
//HER                this.set('tooltip.headerFormat', '<span class="chart-tooltip-time">{point.key}</span><br/>');
                this.set('tooltip.pointFormatter', function(){ return _this._tooltip_pointFormatter_single.call(this, _this); });
            }
            else {
                //Display multi paramater or location in a table to have correct align
//HER                this.set('tooltip.headerFormat', '<span class="chart-tooltip-time">{point.key}</span><table class="chart-tooltip-table">');
                this.set('tooltip.pointFormatter', function(){ return _this._tooltip_pointFormatter_multi.call(this, _this); });
//HER                this.set('tooltip.footerFormat', '</table>');
            }
            this.set('tooltip.footerFormat', '</table>');


            //y-axis - if one parameter => no text on axis
            chartOptions.yAxis = [];
            var seriesAxisIndex = [];
            if (this.multiLocation || this.singleSingle){
                chartOptions.yAxis.push( {
                    crosshair   : true,
                    opposite    : false,
                    labels      : this.parameter[0].hcOptions_axis_labels(),
                    title       : {enabled: false}
                });
                //All series use the same axis
                seriesAxisIndex = Array(this.location.length).fill(0);
            }
            else {
                //The y-axis for multi-parameter is added in a order to have the y-axis in the same order (left to rigth) as the serie legned
                //The first half of the y-axis is palced to the left but added in revers order to have the first series axis to the left
                //The rest of the axis are added on the right side
                //Eg. 5 y-axis (0-4) must be added in the order 2,1,0,3,4 to have position 0 1 2 chart 3 4
                var leftAxisIndex = Math.floor(this.parameter.length / 2);
                for (var i=0; i<this.parameter.length; i++)
                    if (i <= leftAxisIndex)
                        seriesAxisIndex.unshift(i);
                    else
                        seriesAxisIndex.push(i);

                $.each(this.parameter, function(index, parameter){
                    var color = Highcharts.getOptions().colors[index],
                        style = {color: color},
                        nextAxis = {
                            lineColor: color,
                            lineWidth: 1,

                            opposite: index > leftAxisIndex,
                            title: {
                                text: parameter.decodeGetName(true, true),
                                style: style
                            },
                            labels: {
                                formatter: parameter.hcOptions_axis_labels_formatter(),
                                style: style
                            }
                        };

                    //Replace the index-number in yAxis with the axis-options
                    chartOptions.yAxis[ seriesAxisIndex[index] ] = nextAxis;
                });
            }

            //Name of series
            chartOptions.series = [];
            if (this.multiParameter || this.singleSingle)
                $.each(this.parameter, function(index, parameter){
                    chartOptions.series.push({
                        name         : parameter.decodeGetName(true),
                        nameInTooltip: parameter.decodeGetName(false, true) ,
                        color        : Highcharts.getOptions().colors[index],
                        yAxis        : seriesAxisIndex[index],
                        tooltip      : parameter.hcOptions_series_tooltip(), data: [1,2,3,4,5,6,7]
                    });
                });
            else {
                $.each(this.locationName, function(index, location){
                    chartOptions.series.push({
                        name    : location,
                        color   : Highcharts.getOptions().colors[index],
                    });
                });
            }

            //Create the chart
            var chart = this.chart = this.chartConstructor(this.options.container, this.chartOptions/*, callback*/);
            chart.fcooTimeSeries = this;

            //Load data
            chart.promiseList = new window.PromiseList({
                finish: function(){
                    _this.finally(_this);

                    chart.redraw(false);

                    _this._finally();

                }
            });
            $.each(this.data, function(index, timeSeriesData){
                timeSeriesData.series = chart.series[index];
                chart.promiseList.append( timeSeriesData.promiseListOptions() );
            });
            chart.promiseList.promiseAll();

            return chart;
        }
    };


    /****************************************************************************
    TimeSeries
    Create a single line time-serie
    options = {
        container
        parameter   : []Parameter or Parameter
        location    : []Location Or Location
        data        : []TimeSeriesDataOptions or TimeSeriesDataOptions
        chartOptions: JSON
        finally     : function(timeSeries) (optional) Called when all data are loaded.
                        Used when eg. not all data-source need there own series but need to be combined
    }
    ****************************************************************************/
    function TimeSeries(options){
		BaseTimeSeries.call(this, options);
    }

    TimeSeries.prototype = Object.create(BaseTimeSeries.prototype);

    //$.extend(TimeSeries.prototype, {
    //    new_method: function(){
    //    }
    //});


    nsHC.timeSeries = function(options){
        return (new TimeSeries(options)).createChart();
    };

    /****************************************************************************
    HistoricalTimeSeries
    Create a historical single line time-serie with min, max and mean
    options = {
        container
        parameter   : Parameter
        location    : Location
        data        : TimeSeriesDataOptions
        chartOptions: JSON
        finally     : function(timeSeries) (optional) Called when all data are loaded.
                        Used when eg. not all data-source need there own series but need to be combined
    }
    ****************************************************************************/
    function HistoricalTimeSeries(options){
		BaseTimeSeries.call(this, options);
        this.chartConstructor = nsHC.stockChart;
    }

    HistoricalTimeSeries.prototype = Object.create(BaseTimeSeries.prototype);
    $.extend(HistoricalTimeSeries.prototype, {
        //**********************************************
        _finally: function(){
            var chart = this.chart;

            chart.rangeSelector.clickButton(3, true);

            /* TODO: Default select period start now
            chart.events.load
            chart.xAxis[0].setExtremes(
                moment().valueOf(),
                moment().valueOf() + 30 * 24 * 60 *60 * 1000
            );
            */
        },

        /**********************************************
        valueFormatter
        Calc stat for the point
        **********************************************/
        valueFormatter: function(point){
            var dataGroup = point.dataGroup,
                series = point.series,
                group = dataGroup ?
                            series.yData.slice(
                                dataGroup.start,
                                dataGroup.start + dataGroup.length
                            ).sort( function(a,b){ return a-b; } ) :
                        [point.y],
                minValue  = point.formatValue(group[0]),
                meanValue = point.formatValue(point.y),
                //meanText  = '(' + i18next.s({da:'Middel=', en:'Mean='}), //Version 1
                maxValue  = point.formatValue(group[group.length - 1]),
                toChar    = '&#9656;', //&#9658; or &#8594; or &#9656;
                result    = '';

            /*Version 1: mean (min- max)
            if ((minValue == meanValue) && (meanValue == maxValue))
                result = `<b>${meanValue}</b>`;
            else
                if ((minValue == meanValue) || (meanValue == maxValue))
                    result = `<b>${minValue}&nbsp;${toChar}&nbsp;${maxValue}</b>`;
                else
                    result = `<b>${meanValue}</b>&nbsp;(${minValue}&nbsp;${toChar}&nbsp;${maxValue})`;
            //*/

            //*Version 2: min-max (mean)
            if ((minValue == meanValue) && (meanValue == maxValue))
                result = `<b>${meanValue}</b>`;
            else
                result = `<b>${minValue}&nbsp;${toChar}&nbsp;${maxValue}</b>`;

            if ((minValue == meanValue) || (meanValue == maxValue))
                //meanValue = meanText  = '';     //Version 1
                meanValue = '';                 //Version 1
            else
                //meanValue += ')';                        //Version 1
                meanValue = '(' + meanValue + ')'; //Version 2

            //result = result + `</td><td class="chart-tooltip-value">${meanText}</td><td class="chart-tooltip-value">${meanValue}`; //Version 1
            result = result + `</td><td class="chart-tooltip-value">${meanValue}`; //Version 2
            //*/

            return result;
        }
    });


    nsHC.historicalTimeSeries = function(options){
        return (new HistoricalTimeSeries(options)).createChart();
    };

}(jQuery, this.Highcharts, this.i18next, this.moment, this, document));