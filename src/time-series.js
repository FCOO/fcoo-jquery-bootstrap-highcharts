/****************************************************************************
time-series.js

A time-series chart can by type 1:, 2:, or 2:

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
axis        : Each parameter get own y-axis in own color, or all axels in black and only one axis pr parametre


There are tree possible ways to adjust/fix the range of the y-axis for a given parameter.

They can be set in the options for the series as fixedRange: [NUMBER, NUMBER], minRange: NUMBER, or semiFixedRange: [NUMBER, NUMBER]/{min:NUMBER, range:NUMBER}, or
in the options for the time-series as parameterFixedRange: {PARAMETER-ID}[NUMBER, NUMBER], parameterMinRange: {PARAMETER-ID}NUMBER, or parameterSemiFixedRange: {PARAMETER-ID}[NUMBER, NUMBER]/{min:NUMBER, range:NUMBER}

fixedRange      : [from, to] Sets the range to from - to regardles of the data-range
minRange        : NUMBER = Standard Highchart minRange options for yAxis
semiFixedRange  : [min, range] or {min:NUMBER, range:NUMBER}. Set min-range = range but also fixed the min-value at min

fixedRange, minRange, semiFixedRange can also be set in the Parameter-object (fcoo-parameter-unit)


****************************************************************************/

(function ($, Highcharts, i18next, moment, window, document, undefined) {
    "use strict";

    //Create fcoo-namespace
    var ns = window.fcoo = window.fcoo || {},
        nsParameter = ns.parameter = ns.parameter || {},
        nsColor = ns.color = ns.color || {},
        nsHC = ns.hc = ns.highcharts = ns.highcharts || {};

    /*
    //Fix to allow more than two series linked together being highlighted when hover
    Highcharts.addEvent(Highcharts.Chart, 'afterLinkSeries', function(e) {
        this.series.forEach(function(s) {
            if (s.linkedParent) {
                s.linkedParent.linkedSeries.forEach(function(linkedS) {
                    if (linkedS !== s) {
                        s.linkedSeries.push(linkedS);
                    }
                });
            }
        });
    });
    //*/

    /*********************************************************
    DIRECTION ARROWS
    There are 12 different type of arrows to be used.
    They are id'ed by the cooresponding filename in src/images
    The width, height are taken directly from the svg-files
    They are used to scale the selected arrow-images
    *********************************************************/
    var directionArrows = {
            "fal-arrow-alt-up"      : {fileName:"fal-arrow-alt-up.svg",         width: 448, height: 512},
            "fal-arrow-up"          : {fileName:"fal-arrow-up.svg",             width: 448, height: 512},
            "fal-long-arrow-alt-up" : {fileName:"fal-long-arrow-alt-up.svg",    width: 256, height: 512},
            "fal-long-arrow-up"     : {fileName:"fal-long-arrow-up.svg",        width: 256, height: 512},
            "far-arrow-alt-up"      : {fileName:"far-arrow-alt-up.svg",         width: 448, height: 512},
            "far-arrow-up"          : {fileName:"far-arrow-up.svg",             width: 448, height: 512},
            "far-long-arrow-alt-up" : {fileName:"far-long-arrow-alt-up.svg",    width: 256, height: 512},
            "far-long-arrow-up"     : {fileName:"far-long-arrow-up.svg",        width: 320, height: 512},
            "fas-arrow-alt-up"      : {fileName:"fas-arrow-alt-up.svg",         width: 448, height: 512},
            "fas-arrow-up"          : {fileName:"fas-arrow-up.svg",             width: 448, height: 512},
            "fas-long-arrow-alt-up" : {fileName:"fas-long-arrow-alt-up.svg",    width: 256, height: 512},
            "fas-long-arrow-up"     : {fileName:"fas-long-arrow-up.svg",        width: 320, height: 512}
        };

    /*********************************************************
    The axis-option minRange is not working quite as expected.
    The range can get quit larger than minRange because of other options.
    See https://github.com/highcharts/highcharts/issues/13485
    Therefore a new tickPositioner-function is used to get
    better min-range implementation

    2025-02-26:
    Unknown if the issue has been solved in version 12
    For now using default calculation
    If axis.minRange is set startOnTick and endOnTick is
    also set = false (changed from previous version)
    *********************************************************/

    /*********************************************************
    axis_tickPositioner_fixedRange
    Adjust the tick with labels for axis with fixed range
    Adds min, max and zero (if the are missing)
    *********************************************************/
    function axis_tickPositioner_fixedRange(/*min, max*/){
        let result = [0, this.min, this.max];
        this.tickPositions.forEach( tickValue => {
            if (tickValue && (tickValue >= this.min) && (tickValue <= this.max))
                result.push(tickValue);
        });
        result.sort();
        return result;
    }

/* NOT USED
    function axis_tickPositioner_semiFixedRange(){
        let result;
        if (this.paddedTicks)
            result = [Math.min(...this.paddedTicks), 0, Math.max(...this.paddedTicks)];
        else
            result = [0];

        this.tickPositions.forEach( tickValue => {
            result.push(tickValue);
        });
        result.sort();
        return result;
    }
*/
    function axis_tickPositioner_minRange(/*min, max*/){
        return this.tickPositions;
/* @todo
        let dataRange = this.dataMax - this.dataMin;

        if (dataRange > this.options.minRange)
            return this.tickPositions;

        let dataCenter   = this.dataMin + dataRange/2,
            minRange     = this.options.minRange,
            maxValue     = dataCenter + minRange/2,
            minValue     = dataCenter - minRange/2,
            maxTickIndex = this.tickPositions.length,
            minTickIndex = 0;

        this.tickPositions.forEach( (tickValue, index) => {
            if (tickValue > dataCenter){
                if (maxValue <= tickValue)
                    maxTickIndex = index;
            }
            else {
                if (minValue >= tickValue)
                    minTickIndex = index;
            }
        });
        return this.tickPositions.slice(minTickIndex, maxTickIndex+1);
*/
    }

    /****************************************************************************
    convert-function.
    Every singleTimeSeries (see below) must provide a convert-function that receive
    the data read from a data-file or the data given directly to the SingleTimeSeries-constructor
    and return a object or array with info regarding series-data


    standardConvert
    ****************************************************************************/
    function standardConvert(data){
        return  Array.isArray(data) ?
                {data: data} : {
                    data         : data.data || this.data,
                    pointStart   : data.start || data.pointStart || this.start,
                    pointInterval: data.interval || data.pointInterval || this.interval
                };
    }

    /****************************************************************************
    SingleTimeSeries
    A object representing a single time-series or time-range-series and convert in into the right HC-format.
    options = SERIESOPTIONS = {
        Standard Highcharts Series-options e.q.
            lineWidth   : NUMBER
            dashStyle   : STRING Default = 'Solid' See https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/series-dashstyle-all/
                          Possible values: 'Solid','ShortDash','ShortDot','ShortDashDot','ShortDashDotDot','Dot','Dash','LongDash','DashDot','LongDashDot','LongDashDotDot'

            connectNulls : false
            maxGap       : Maximum gap between to points in minutes. Is converted to options gapSize

            gapUnit      : Set to 'value' if maxGap is given

            directionArrow: true        //Use default setting
            directionArrow: false       //Do not display direction arrows/images
            directionArrow: STRING      //id from directionArrows of arrow to use

            showAllArrows: BOOLEAN (false)    //When true all arrows are shown, when false the number of arrows shown are adjusted automatic to prevent overlap

            showLegendArrow: BOOLEAN (false).   If true and directionArrow the direction arrow used for a series is shown in the legend.
                                                It is the directionArrow and showLegendArrow of the first sub-series that desides if and what to show in the legend

        Special options:
            color       : NUMBER = index in default color-list (Blue, Red, Green,...)
            deltaColor  : NUMBER is relative to window.fcoo.color.defaultGradient (+ = darker - = lighter)
            marker      : true, STRING, false. true: Next default marker, false: no marker
            markerSize  : NUMBER converts to marker.radius if marker != false
            noTooltip   : BOOLEAN. When true the series do not have a tooltip

            alwaysShowParameter: BOOLEAN (false). For TimeSeries with one parameter at one location the parameter name is not shown in tooltips or at y-axis except when alwaysShowParameter=true

            noMenu    : BOOLEAN (false). When true no top right menu for export is shown
            noTitle   : BOOLEAN (false). When true no title is shown
            noSubTitle: BOOLEAN (false). When true no sub-title is shown
            noLegend  : BOOLEAN (false). When true no legends are shown
            noZoom    : BOOLEAN (false). When true the x-zoom is disabled




        The data:
            data        : DATAOPTIONS
    }


    DATAOPTIONS = options for one set of data

    1: DATAOPTIONS = {
        start   : STRING. Moment-string
        interval: STRING. Moment-duration
        data    : []SINGLEDATA
    }, or
    2: DATAOPTIONS = {
        data: [][FLOAT, SINGLEDATA] or []TS_SINGLEDATA
    }, or
    3: DATAOPTIONS = [][FLOAT, SINGLEDATA] or []TS_SINGLEDATA
    4: DATAOPTIONS = {
        fileName: STRING or {mainDir:STRING|BOOLEAN, subDirName:STRING, fileName:STRING} See fcoo-data-files
        convert : FUNCTION(data, singleTimeSeries): Convert data into the correct format in SingleTimeSeries
    }

    If data are vector-data:
        SINGLEDATA = [FLOAT, FLOAT] (speed, direction) or {y:FLOAT, d:FLOAT} or {y:FLOAT, direction:FLOAT} or {speed:FLOAT, direction:FLOAT}
        TS_SINGLEDATA = {x:TIMESTAMP, y:FLOAT, d:FLOAT} or {x:TIMESTAMP, y:FLOAT, direction:FLOAT} or {x:TIMESTAMP, speed:FLOAT, direction:FLOAT}

    SingleTimeSeries(options)
    ****************************************************************************/
    var SingleTimeSeries = function(options){

        this.redraw = false;

        this.options = options;
        this.convert = options.convert || standardConvert;

        //For some reason it is necessary to 'copy' this methods. Perhaps because Highcharts make a not full copy at some point
        this.myDirectionAsText = this.directionAsText;

        //Set options for src of small images (with arrows) used to display direction of a vector-parameter
        if (this.options.directionArrow){
            var arrowId  = 'far-long-arrow-alt-up', //'fas-arrow-up', //'fal-long-arrow-up',
                dirArrow = directionArrows[arrowId],
                dim      = 16;

            //Find the selected record in directionArrows
            if (this.options.directionArrow === true)
                /* OK => Use default */;
            else
                if (typeof this.options.directionArrow == 'string')
                    arrowId = this.options.directionArrow;
                else {
                    arrowId = this.options.directionArrow.id || this.options.directionArrow.fileName;
                    dim     = this.options.directionArrow.dim || 16;
                }

            dirArrow = directionArrows[arrowId] || dirArrow;

            //Calc relative widt and height
            var factor = dim / Math.max(dirArrow.width, dirArrow.height);

            this.options.directionMarker = {
                symbol: 'url(images/' + dirArrow.fileName + ')',
                width : factor*dirArrow.width,
                height: factor*dirArrow.height
            };
        }
    };

    SingleTimeSeries.prototype = {
        /*********************************************************
        getChartOptions - Convert and adjust this.options into Highcharts-options
        *********************************************************/
        getChartOptions: function(){
            var o = $.extend(true, {}, this.options);

            //Convert color and deltaColor into color (STRING)
            //color     : NUMBER = index in default color-list (Blue, Red, Green,...)
            //deltaColor: NUMBER is relative to window.fcoo.color.defaultGradient (+ = darker - = lighter)

            let colorName = nsHC.colorList[ o.color % nsHC.colorList.length ];
            o.color = nsColor.getDeltaColor(colorName, o.deltaColor);

            //maxGap = Maximum gap between to points in minutes. Is converted to options gapSize
            if (o.maxGap){
                o.gapSize = o.maxGap * 60*1000;
                o.gapUnit = 'value';
            }
            o.noTooltip = !!o.noTooltip;

            //marker: true, STRING, false. true: Next default marker, false: no marker
            //markerSize  : NUMBER converts to marker.radius if marker != false
            var markerEnabled = !!o.marker || !!o.directionArrow,
                marker = {
                    enabled: markerEnabled,
                    symbol : null
                };
            if (markerEnabled){
                if (o.directionArrow)
                    $.extend(marker, o.directionMarker);
                else {
                    var symbolList = Highcharts.getOptions().symbols;
                    marker.symbol = o.marker === true ? symbolList[this.index % symbolList.length] : o.marker;

                    if (o.markerSize)
                        marker.radius = o.markerSize;
                }
            }
            marker.states = {
                hover: {
                    enabled: !!o.marker || !o.noTooltip
                }
            };
            o.marker = marker;

            //Adjust pre- and postfix for tooltips
            ['tooltipPrefix', 'tooltipLabelPrefix', 'tooltipLabelPostfix', 'tooltipValuePrefix', 'tooltipValuePostfix', 'tooltipPostfix'].forEach( id => o[id] = o[id] ? $._bsAdjustText(o[id]) : null );

            return o;
        },

        /*********************************************************
        directionAsText(direction)
        Convert direction to string if this (SingleTimeSeries)
        is a vector-parameter
        *********************************************************/
        directionAsText: function(direction){
            return this.parameter.speed_direction[1].asText(direction);
        },


        /*********************************************************
        promiseListOptions
        *********************************************************/
        promiseListOptions: function(){
            return {
                fileName: this.options.fileName ? ns.path.dataFileName(this.options.fileName) : null,
                data    : this.options.data,
                resolve : this.resolve.bind(this)
            };
        },

        /*********************************************************
        resolve - Update the chart with the info returned from the convert-function
        *********************************************************/
        resolve: function(data){
            if (!data)
                return this;

            var seriesDataOptions = {},
                options = this.convert(data, this);

            if (options.pointStart){
                //Variation 1
                var pointInterval = options.pointInterval;


                if (pointInterval && (typeof pointInterval == 'string'))
                    pointInterval = moment.duration(pointInterval).milliseconds();

                seriesDataOptions = {
                    pointStart       : moment(options.pointStart).valueOf(),
                    pointInterval    : pointInterval,
                    pointIntervalUnit: options.pointIntervalUnit || null,
                };
            }

            if (options.data)
                //Variation 2
                seriesDataOptions.data = options.data;
            else
                //Variation 3
               seriesDataOptions.data = options;

            /*
            Convert data = []SINGLEDATA (see above) to {y:FLOAT, marker: {symbol:'..'}} if needed
            DATAOPTIONS = options for one set of data

            1: DATAOPTIONS = {
                start   : STRING. Moment-string
                interval: STRING. Moment-duration
                data    : []SINGLEDATA
            }, or
            2: DATAOPTIONS = {
                data: [][FLOAT, SINGLEDATA]
            }, or
            3: DATAOPTIONS = [][FLOAT, SINGLEDATA]
            4: DATAOPTIONS = {
                fileName: STRING or {mainDir:STRING|BOOLEAN, subDirName:STRING, fileName:STRING} See fcoo-data-files
                convert : FUNCTION(data, singleTimeSeries): Convert data into the correct format in SingleTimeSeries
            }

            SINGLEDATA = FLOAT or [FLOAT, FLOAT] (speed, direction) or {y:FLOAT, d:FLOAT} or {y:FLOAT, direction:FLOAT} or {speed:FLOAT, direction:FLOAT}
            */

            var directionArrow = this.options.directionArrow;
            if (this.parameter.type == 'vector'){
                var dataList = seriesDataOptions.data;
                if (dataList)
                    dataList.forEach( (singleDataSet, index) => {
                        var timestep, singleData, speed, direction;
                        if (typeof singleDataSet == 'number')
                            return;

                        if (seriesDataOptions.pointStart){
                            // 1: Ok - singleDataSet is SINGLEDATA
                            singleData = singleDataSet;
                        }
                        else
                            //2:, 3:, 4: singleDataSet = [FLOAT, SINGLEDATA]
                            if (Array.isArray(singleDataSet) && (singleDataSet.length == 2)){
                                timestep   = singleDataSet[0];
                                singleData = singleDataSet[1];
                            }
                            else
                                //2:, 3:, 4: singleDataSet = {x:TIMESTAMP, y/speed: FLOAT, d/direction:FLOAT}
                                if ($.isPlainObject(singleDataSet)){
                                    timestep   = singleDataSet.x;
                                    singleData = singleDataSet;
                                }
                                else
                                    return;

                        //singleData = [FLOAT, FLOAT] (speed, direction) or {y:FLOAT, d:FLOAT} or {y:FLOAT, direction:FLOAT} or {speed:FLOAT, direction:FLOAT}
                        if (Array.isArray(singleData)){
                            speed     = singleData[0];
                            direction = singleData[1];
                        }
                        else {
                            speed     = singleData.y !== undefined ? singleData.y : singleData.speed;
                            direction = singleData.d !== undefined ? singleData.d : singleData.direction;
                        }

                        if ((speed !== undefined) && (direction !== undefined))
                            dataList[index] = {
                                x: timestep,
                                y: speed,
                                direction: directionArrow ? direction : undefined
                            };
                    });
            }

            //Update/sets options
            ['pointStart', 'pointInterval', 'pointIntervalUnit'].forEach( id => {
                let value = seriesDataOptions[id];
                if (value != undefined)
                    this.series.options[id] = value;
            }, this);

            //Update/sets data
            this.series.setData(seriesDataOptions.data, this.redraw);

            this.redraw = true;
        }
    };


    /****************************************************************************
    BaseTimeSeries
    Base constructor for time-series charts
    options = {
        container
        parameter   : []Parameter or Parameter
        location    : []Location Or Location
        series      : SERIESOPTIONS or []SERIESOPTIONS or [](SERIESOPTIONS or []SERIESOPTIONS)
        chartOptions: JSON
            shareYAxis  : BOOLEAN, false. If true series with same parameter using the same y-axis. If false every series gets it own y-axis

        finally     : function(timeSeries) (optional) Called when all data are loaded.

        zeroLine    : BOOLEAN (true). If true a thin horizontal line is drawn on y-axis value 0 in the same color as the series
        verticalLines: VERTICALLINE or []VERTICALLINE

        parameterMinRange       : See description above
        parameterSemiFixedRange :           do
        parameterFixedRange     :           do


    }

    VERTICALLINE = options for a vertical line at value (Number or MOMENT)
    VERTICALLINE = {
        value: NUMBER or MOMENT
        width: 1,
        color: 'black',
        dashStyle: 'solid',
        label: {
            text : STRING
            align: STRING
        }
    }

    ****************************************************************************/
    function BaseTimeSeries(options){
        this.chartOptions = options.chartOptions || {};
        this.chartConstructor = nsHC.chart;
        this.options = $.extend(true, {}, {
            //Default options
            zeroLine            : true,
            verticalLines       : [],
            shareYAxis          : true,
            parameterFixedRange    : {},
            parameterSemiFixedRange: {},
            parameterMinRange      : {}

        },
        options);

        this.finally = options.finally || function(){};

        //Create this.parameter = [9Parameter and this.zList = []STRING/NULL
        this.zList = [];
        let optionsZ = options.z || options.zList || '';

        this.parameter = Array.isArray(options.parameter) ? options.parameter : [options.parameter];
        this.parameter.forEach( (param, index) => {
            this.parameter[index] = ns.parameter.getParameter(param);

            if (Array.isArray(optionsZ))
                this.zList.push( optionsZ.length > index ? optionsZ[index] : null );
            else
                this.zList.push(optionsZ);

        }, this);


        this.parameterFixedRange     = {};
        this.parameterSemiFixedRange = {};
        this.parameterMinRange       = {};

        this.parameter.forEach( param => {
            //Getting the fixedRange, semiFixedRange, and minRange (if any) from the charts options, the parameter or the parameter speed-parameter (if any)
            const pId        = param.id,
                  speedParam = param.speed_direction && param.speed_direction.length ? param.speed_direction[0] : param,
                  speedId    = speedParam.id;

            this.parameterFixedRange[pId]     = this.options.parameterFixedRange[pId]     || param.fixedRange     || speedParam.fixedRange     || null;
            this.parameterSemiFixedRange[pId] = this.options.parameterSemiFixedRange[pId] || param.semiFixedRange || speedParam.semiFixedRange || null;
            this.parameterMinRange[pId]       = this.options.parameterMinRange[pId]       || param.minRange       || speedParam.minRange       || null;

            this.parameterFixedRange[speedId]     = this.parameterFixedRange[pId];
            this.parameterSemiFixedRange[speedId] = this.parameterSemiFixedRange[pId];
            this.parameterMinRange[speedId]       = this.parameterMinRange[pId];
        }, this);

        this.multiParameter = this.parameter.length > 1;

        this.yAxis = this.options.yAxis || this.options.axis || {};
        this.yAxis = Array.isArray(this.yAxis) ? this.yAxis : [this.yAxis];

        //Adjust the unit of the parametrers if any given
        var unitList = options.unit ? (Array.isArray(options.unit) ? options.unit : [options.unit]) : [];
        this.parameter.forEach( (param, index) => {
            if (unitList.length > index){
                //Clone the parameter and set it to use the new unit
                var unit = nsParameter.getUnit(unitList[index]),
                    decimals = Math.max(0, param.decimals + Math.round(Math.log10(unit.SI_factor/param.unit.SI_factor))),
                    clonedParam =  this.parameter[index] = $.extend(true, {}, param);
                clonedParam.decimals = decimals;
                clonedParam.unit = unit;

                //If the parameter is a vector => clone the speed-parameter with new unit
                if (clonedParam.type == 'vector'){
                    var speedParam = clonedParam.speed_direction[0] = $.extend(true, {}, clonedParam.speed_direction[0]);
                    speedParam.decimals = decimals;
                    speedParam.unit = unit;
                }
            }
        }, this);

        options.location = options.location || '';
        this.location  = Array.isArray(options.location)  ? options.location  : [options.location];
        this.locationName = [];
        this.location.forEach( (loc, index) => {
            this.locationName[index] = loc ? $._bsAdjustIconAndText(loc).text : '';
        }, this);
        this.multiLocation = this.location.length > 1;

        this.singleSingle = !this.multiParameter && !this.multiLocation;

        this.series    = [];  //= [] of the main series
        this.subSeries = [];  //= [] of the sub series. If a series contains of multi series the first is added to this.series and the rest to subSeries with link to legend and axis for the first series

        this.anyHasTooltip  = false; //true if at least one series has tooltip. Is updated when a series is added using this._createSingleTimeSeries
        this.allHaveTooltip = true;  //true if ALL series have tooltip. Is updated when a series is added using this._createSingleTimeSeries

        (Array.isArray(options.series)  ? options.series : [options.series]).forEach( (seriesOptions, index) => {

            //If seriesOptions is an array => it contains list of series-options where [0] is the main and [1..N] is sub-series linked to the main seriesdata for a single series, else opt is a multi series
            if (Array.isArray(seriesOptions)){
                var mainSingleTimeSeries = this._createSingleTimeSeries(seriesOptions[0], index);
                this.series.push(mainSingleTimeSeries);

                //Add the rest as sub series
                seriesOptions.forEach( (subSeriesOptions, subIndex) => {
                    if (subIndex)
                        this.subSeries.push( this._createSingleTimeSeries(subSeriesOptions, index, mainSingleTimeSeries) );
                }, this);
            }
            else
                this.series.push( this._createSingleTimeSeries(seriesOptions, index) );
        }, this);
    }

    BaseTimeSeries.prototype = {
        /**********************************************
        _createSingleTimeSeries(options, index, mainSeries){
        ************************************************/
        _createSingleTimeSeries(options, index, mainSeries){
            //If a mainSeries is given => use its options (without data) as default options for the new SingleTimeSeries
            if (mainSeries){
                var data = mainSeries.options.data;
                delete mainSeries.options.data;
                var mainOptions = $.extend(true, {}, mainSeries.options);
                mainSeries.options.data = data;
                options = $.extend(true, mainOptions, options);
            }

            //Set default options
            options = $.extend(true, {
                color     : index,
                deltaColor: 0,
                marker    : true,
                lineWidth : 2,
                dashStyle : 'Solid',
                noTooltip : false,
            }, options);

            //Create the SingleTimeSeries
            var singleTimeSeries = new SingleTimeSeries(options);
            singleTimeSeries.index = index;
            singleTimeSeries.timeSeries = this;

            if (mainSeries){
                mainSeries.hasSubSeries = true;
                mainSeries.subSeries = mainSeries.subSeries || [];
                mainSeries.subSeries.push(singleTimeSeries);
            }


            singleTimeSeries.parameter  = this.multiParameter ? this.parameter[index] : this.parameter[0];
            singleTimeSeries.location   = this.multiLocation  ? this.location[index]  : this.location[0];


            this.anyHasTooltip = this.anyHasTooltip || !options.noTooltip;
            if (options.noTooltip)
                this.allHaveTooltip = false;

            return singleTimeSeries;
        },

        /**********************************************
        _tooltip_get_fix: function(point){
        ************************************************/
        _tooltip_get_fix: function(point){
            var result = {};
            ['Prefix', 'Postfix'].forEach( position => {
                ['', 'Label', 'Value'].forEach( subId => {
                    var id = 'tooltip' + subId + position,
                        value = point.series.options[id];
                    result[id] = value ? i18next.s(value) : '';
                });
            });
            return result;
        },


        //_tooltip_pointFormatter_single - called with this == Point
        _tooltip_pointFormatter_single: function(timeSeries){
            if (this.series.options.noTooltip)
                return '';
            var fix = timeSeries._tooltip_get_fix(this);
            return  `<tr>
                        <td class="chart-tooltip-value">` +
                            fix.tooltipPrefix +
                            fix.tooltipLabelPrefix +
                            timeSeries.valueFormatter(this)  +
                            fix.tooltipLabelPostfix +
                            fix.tooltipPostfix +
                        `</td>
                    </tr>`;
        },

        //_tooltip_pointFormatter_multi - called with this == Point
        _tooltip_pointFormatter_multi: function(timeSeries){
            if (this.series.options.noTooltip)
                return '';

            var serieName = i18next.s( $._bsAdjustText( timeSeries.multiLocation ? this.series.name : this.series.options.nameInTooltip ) ),
                fix = timeSeries._tooltip_get_fix(this);

            //Char &#9606; = LOWER THREE QUARTERS BLOCK Alt = &#9609; = LEFT SEVEN EIGHTHS BLOCK,
            return  `<tr>
                        <td class="chart-tooltip-color-dot" style="color:${this.color};">&#9606;</td>
                        <td class="chart-tooltip-name">
                            ${fix.tooltipPrefix}${fix.tooltipLabelPrefix}${serieName}${fix.tooltipLabelPostfix}&nbsp;
                        </td>
                        <td class="chart-tooltip-value">` +
                            fix.tooltipValuePrefix +
                            timeSeries.valueFormatter(this)  +
                            fix.tooltipValuePostfix +
                            fix.tooltipPostfix +
                        `</td>
                    </tr>`;
        },

        valueFormatter: function(point){
            var directionAsText = point.direction == undefined ? '' : point.series.userOptions.singleTimeSeries.myDirectionAsText(point.direction);
            return  '<b>'+
                        (directionAsText ? directionAsText + ' ' : '') +
                        point.formatValue(point.y) +
                    '</b>';
        },

        /**********************************************
        _finally
        ************************************************/
        _finally: function(){},

        /**********************************************
        set(path, options)
        ************************************************/
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

        /**********************************************
        createChart
        ************************************************/
        createChart: function(container){
            var _this = this,
                chartOptions = this.chartOptions;

            //Destroy the chart (if any). In furture versions is will be possible to har the samee TimeSeries used to create multi charts
            this.destroyChart();

            //Title
            if (this.options.noTitle)
                this.set('title.text', '');
            else {
                if (this.multiParameter || this.singleSingle)
                    this.set('title.text', this.locationName[0]);
                else
                    this.set('title.text', this.parameter[0].decodeGetName(true, false, this.zList[0]));
            }

            //Sub-title = paramter-name if only one location and one paramter
            if (this.singleSingle){
                if (!this.options.noSubTitle)
                    this.set('subtitle', this.parameter[0].hcOptions_axis_title(this.zList[0]));

                this.set('legend.enabled', false);
            }
            else
                //Legend centered at top
                this.set('legend', {
                    align        : 'center',
                    borderWidth  : 0,
                    enabled      : !this.options.noLegend,
                    margin       : 12,
                    verticalAlign: 'top',
                });

            //Zoomable
            if (!this.options.noZoom)
                this.set('chart.zoomType', 'x');

            //Exporting menu in top right
            this.set('exporting.enabled', !this.options.noMenu);

            //x-axis
            this.set('xAxis', this.options.xAxis || {});
            this.set('xAxis.crosshair', true);
            this.set('xAxis.type', 'datetime');

            //Set vertical line
            var plotLines = [],
                verLineList = this.options.verticalLines || [];
            ( Array.isArray(verLineList) ? verLineList : [verLineList]).forEach( lineOptions => {
                lineOptions = $.extend(true, {}, {
                    width    : 1,
                    color    : 'black',
                    dashStyle: 'solid'
                }, lineOptions);

                lineOptions.value = moment.isMoment(lineOptions.value) ? lineOptions.value.valueOf() : lineOptions.value;
                plotLines.push( lineOptions );
            });
            this.set('xAxis.plotLines', plotLines);



            //Default time-step = one hour
            this.set('plotOptions.series.pointInterval', 60*60*1000);

            //Tooltips
            this.set('tooltip.enabled', this.anyHasTooltip);
            if (this.anyHasTooltip){
                //Set common tooltip for single parameter-mode (in multi-parameter mode the tooltip is set pro series
                chartOptions.tooltip = this.parameter[0].hcOptions_series_tooltip('', this.zList[0]);

                $.extend(chartOptions.tooltip, this.options.tooltip || {});

                this.set('tooltip.shared', true);
                this.set('tooltip.split', false);

                this.set('tooltip.borderColor', '#868e96'); //Hard-coded from jquery-bootstrap!
                this.set('tooltip.borderRadius', 8);

                this.set('tooltip.headerFormat', '<span class="chart-tooltip-time">{point.key}</span><table class="chart-tooltip-table">');
                if (this.singleSingle && !this.options.alwaysShowParameter)
                    //Single location and paramater
                    this.set('tooltip.pointFormatter', function(){ return _this._tooltip_pointFormatter_single.call(this, _this); });
               else
                    //Display multi paramater or location in a table to have correct align
                    this.set('tooltip.pointFormatter', function(){ return _this._tooltip_pointFormatter_multi.call(this, _this); });

                this.set('tooltip.footerFormat', '</table>');

                if (!this.allHaveTooltip){
                    //Check if the current series has tooltip and hide it if not
                    this.set('tooltip.formatter', function(tooltip){
                        var points = this.point ? [this.point] : this.points || [],
                            showTooltip = false;

                        points.forEach( point => {
                            if (!point.series.options.noTooltip){
                                showTooltip = true;
                                return true;
                            }
                        });
                        return showTooltip ? tooltip.defaultFormatter.call(this, tooltip) : false;
                    });
                }
            } //if (this.anyHasTooltip){...

            //y-axis - if one parameter => no text on axis
            chartOptions.yAxis = [];
            let nextAxis;

            if ((this.multiLocation || this.singleSingle) && !this.options.alwaysShowParameter){
                nextAxis = {
                    id           : 'ALL',
                    parameterId  : this.parameter[0].id,
                    originalIndex: 0,
                    crosshair    : true,
                    opposite     : false,
                    labels       : this.parameter[0].hcOptions_axis_labels(),
                    title        : {enabled: false}
                };

                if (this.parameter[0].negative && this.options.zeroLine)
                    nextAxis.plotLines = [{
                        color: 'black',
                        width: 2,
                        value: 0
                    }];
                if (!this.parameter[0].negative)
                    nextAxis.min = 0;

                chartOptions.yAxis.push( nextAxis );

                //All series use the same axis
                this.series.forEach( series => series.yAxisId = 'ALL' );

            }
            else {
                let shareYAxis = !!this.options.shareYAxis;

                this.parameter.forEach( param => param.yAxisId = '' );

                //If shareYAxis => check if there are multi series with same parameter. Acount for the possible that the Parameter in this.parameter[] can be a clone of Parameter => this.parameter[x].id == this.parameter[y].id but this.parameter[x] not equal this.parameter
                let isUniqueParameter = {};
                if (shareYAxis){
                    shareYAxis = false;
                    this.parameter.forEach( param => {
                        if (isUniqueParameter[param.id])
                            shareYAxis = true;
                        else
                            isUniqueParameter[param.id] = true;
                    });
                }

                //Create all the yAxis needed
                let yAxisIds = {}; //{id}YAXIS-OPTIONS

                this.parameter.forEach( (parameter, index) => {
                    let yAxisId = parameter.id + (shareYAxis ? '' : index);
                    this.series[index].yAxisId = yAxisId;

                    if (yAxisIds[yAxisId]){
                        //It is a joint y-axis => color = black
                        yAxisIds[yAxisId].title.style.color = 'black';
                        return;
                    }

                    let color = this.series[index].getChartOptions().color,
                        style = {color: color},
                        z = this.zList[index];

                    nextAxis = {
                        id           : yAxisId,
                        parameterId  : parameter.id,
                        originalIndex: index,

                        lineColor: color,
                        lineWidth: 1,

                        title: {
                            text: parameter.decodeGetName(true, true, this.singleSingle && z ? z : false),
                            style: style
                        },
                        showEmpty: false,   //=> Remove both axis and title when series is unselected

                        labels: {
                            formatter: parameter.hcOptions_axis_labels_formatter(),
                            style: style
                        }
                    };

                    if (this.options.zeroLine && parameter.negative)
                        nextAxis.plotLines = [{
                            color: color,
                            width: 2,
                            value: 0
                        }];
                    if (!parameter.negative)
                        nextAxis.min = 0;

                    yAxisIds[yAxisId] = nextAxis;

                }, this);

                let yAxis = [];
                $.each(yAxisIds, (id, yAxisOptions) => yAxis.push( yAxisOptions ) );

                //The y-axis for multi-parameter is added in a order to have the y-axis in the same order (left to rigth) as the series legned
                //The first half of the y-axis is palced to the left but added in revers order to have the first series axis to the left
                //The rest of the axis are added on the right side
                yAxis.sort( (a1, a2) => { return a1.originalIndex - a2.originalIndex; } );
                const halfLength = Math.ceil(yAxis.length / 2);
                yAxis.forEach( (yAxis, index) => yAxis.opposite = (index >= halfLength) );

                chartOptions.yAxis = yAxis;
            }

            //Update yAxis with other options
            let addEvent = ( originalEvent, newEvent ) => {
                    if (originalEvent)
                        return function( _originalEvent ){
                            return function(){
                                _originalEvent.apply(this, arguments);
                                return newEvent.apply(this, arguments);
                            };
                        }(originalEvent);
                    else
                        return newEvent;
                };

            let setOption = ( originalValue, newValue ) => {
                    return originalValue === undefined ? newValue : originalValue;
                };

            this.yAxis.forEach( (options, index) => {
                chartOptions.yAxis.forEach( (yAxis, cIndex) => {
                    if (yAxis.originalIndex == index)
                        chartOptions.yAxis[cIndex] = $.extend(true, yAxis, options);
                });
            });


            //Update all yAxis with default options
            chartOptions.yAxis.forEach( options => {

                //Move the label just above the line
                options.labels = options.labels || {};
                options.labels.y = -2;

                //Set label right-align. Only works as expected for left-sided axis (why??)
                if (!options.opposite)
                    options.labels.align = 'right';

                //Set options for the y-axis regarding ((semi-)-fixed-)rang
                options.fixedRange      = options.fixedRange     || this.parameterFixedRange[options.parameterId];
                options.semiFixedRange  = options.semiFixedRange || this.parameterSemiFixedRange[options.parameterId];
                options.minRange        = options.minRange       || this.parameterMinRange[options.parameterId];

                if (options.fixedRange){
                    options.min             = options.fixedRange[0];
                    options.max             = options.fixedRange[1];
                    options.startOnTick     = setOption( options.startOnTick, false );
                    options.endOnTick       = setOption( options.endOnTick,   false );
                    options.tickPositioner  = addEvent( options.tickPositioner, axis_tickPositioner_fixedRange);
                    options.semiFixedRange  = null;
                    options.minRange        = null;
                }
                else
                    if (options.semiFixedRange){
                        if (Array.isArray(options.semiFixedRange))
                            options.semiFixedRange = {
                                min  : options.semiFixedRange[0],
                                range: options.semiFixedRange[1]
                        };
                        options.min            = options.semiFixedRange.min;
                        options.minRange       = options.semiFixedRange.range;
                        options.startOnTick    = setOption( options.startOnTick, true );
                        options.endOnTick      = setOption( options.endOnTick,   true );
                        //options.tickPositioner = addEvent( options.tickPositioner, axis_tickPositioner_semiFixedRange);
                    }
                    else
                        if (options.minRange){
                            options.startOnTick    = setOption( options.startOnTick, true  );
                            options.endOnTick      = setOption( options.endOnTick,   true  );
                            options.tickPositioner = addEvent( options.tickPositioner, axis_tickPositioner_minRange);
                        }
            }, this);


            //Name of series
            chartOptions.series = [];
            if (this.multiParameter || this.singleSingle)
                this.parameter.forEach( (parameter, index) => {
                    let z = this.zList[index];
                    chartOptions.series.push({
                        name         : parameter.decodeGetName(true, false, z),
                        nameInTooltip: parameter.decodeGetShortName(false, false/*true*/, z), //<- Changed 2021-06-10 to show vector-name instead of speed-name
                        yAxis        : this.series[index].yAxisId,
                        tooltip      : parameter.hcOptions_series_tooltip('', z)
                    });
                }, this);
            else
                if (this.locationName)
                    this.locationName.forEach( location => chartOptions.series.push({name: location}) );

            //Set style and id for the added series
            chartOptions.series.forEach( (seriesOptions, index) => {
                chartOptions.series[index] = $.extend(true, seriesOptions, this.series[index].getChartOptions());
                chartOptions.series[index].id =  'fcoo_series_' + index;
            }, this);

            //Add sub series
            if (this.subSeries)
                this.subSeries.forEach( singleTimeSeries => {
                    //seriesOptions = options for the new sub series = copy of the series it is sub to
                    var seriesOptions = $.extend(true, {}, chartOptions.series[singleTimeSeries.index]);
                    seriesOptions.id = 'fcoo_series_' + chartOptions.series.length;
                    seriesOptions.linkedTo = 'fcoo_series_' + singleTimeSeries.index;

                    seriesOptions = $.extend(true, seriesOptions, singleTimeSeries.getChartOptions());
                    chartOptions.series.push(seriesOptions);
                });

            /*
            If the series has direction arrows AND showLegendArrow = false
            the image of the arrow in the legend are hidden.
            The solution is not that elegant, but there was no (known) options
            in Highchart to control this nor any (known) css-classes to alter
            */
            var anySeriesNeedToHideArrow = false;
            if (this.series)
                this.series.forEach( singleTimeSeries => {
                    if (singleTimeSeries.options.directionArrow && !singleTimeSeries.options.showLegendArrow){
                        anySeriesNeedToHideArrow = true;
                        singleTimeSeries.options.hideLegendArrow = true;
                    }
                });

            if (anySeriesNeedToHideArrow)
                this.set('chart.events.render', function(){
                    this.series.forEach( singleTimeSeries => {
                        if (
                            singleTimeSeries.options.hideLegendArrow &&
                            singleTimeSeries.series &&
                            singleTimeSeries.series.legendSymbol &&
                            singleTimeSeries.series.legendSymbol.element
                        )
                            singleTimeSeries.series.legendSymbol.element.style.display = 'none';
                    });
                }.bind(this));


            /****************************************
            Create the chart
            ****************************************/
            var chart = this.chart = this.chartConstructor(container || this.options.container, this.chartOptions);
            chart.fcooTimeSeries = this;

            //Load data
            chart.promiseList = new window.PromiseList({
                finish: function(){

                    this.finally(this);

                    chart.redraw(false);

                    this._finally();

                }.bind(this)
            });

            //Link Series and SingleTimeSeries
            if (this.series)
                this.series.forEach( (singleTimeSeries, index) => {
                    singleTimeSeries.series = chart.series[index];
                    singleTimeSeries.series.userOptions.singleTimeSeries = singleTimeSeries;

                    chart.promiseList.append( singleTimeSeries.promiseListOptions() );
                });

            var thisSeriesLength = this.series.length;
            if (this.subSeries)
                this.subSeries.forEach( (singleTimeSeries, index) => {
                    singleTimeSeries.series = chart.series[thisSeriesLength + index];
                    singleTimeSeries.series.userOptions.singleTimeSeries = singleTimeSeries;

                    chart.promiseList.append( singleTimeSeries.promiseListOptions() );
                });
            chart.promiseList.promiseAll();
            return chart;
        },

        /**********************************************
        destroyChart
        ************************************************/
        destroyChart: function(){
            if (this.chart)
                this.chart.destroy();
            return this;
        },

        /**********************************************
        setData
        A simple method to update/replace data for one parameter
        ************************************************/
        setData: function(parameterId, data){
            return this.setSingleSeriesData(this.series.find((singleSeries) => singleSeries.parameter.id == parameterId), data);
        },

        /**********************************************
        setSingleSeriesData
        A simple method to update/replace data for a given singleSeries
        ************************************************/
        setSingleSeriesData: function(singleSeries, data){
            if (!singleSeries || !data) return this;

            /*
            There are two posibilities:
                singleSeries do not have subSeries => data are used directley
                singleSeries have subSeries => data must be []Data and each SingleSeries are updated with new data (if any)
            */
            if (singleSeries.hasSubSeries && !Array.isArray(data))
                return;

            let seriesList = [], dataList = [];
            //Add main Series to lists
            seriesList.push(singleSeries);
            dataList.push(singleSeries.hasSubSeries ? data[0] : data);
            if (singleSeries.hasSubSeries){
                for (var dataIndex=1; dataIndex < data.length; dataIndex++){
                    let seriesIndex = dataIndex - 1;
                    if (seriesIndex < singleSeries.subSeries.length){
                        seriesList.push(singleSeries.subSeries[seriesIndex]);
                        dataList.push(data[dataIndex]);
                    }
                }
            }
            dataList.forEach((data, index) => data ? seriesList[index].resolve(data) : null );
            return this;
        },


        /**********************************************
        setAllData
        A simple method to update/replace data for all parameters
        ************************************************/
        setAllData: function(data){
            if (!Array.isArray(data))
                return;

            this.series.forEach((singleSeries, index) => {
                this.setSingleSeriesData(singleSeries, index < data.length ? data[index] : null);
            }, this);

        }


    };


    /****************************************************************************
    TimeSeries
    Create a single line time-series
    options = {
        container
        parameter   : []Parameter or Parameter
        location    : []Location Or Location
        series      : []SingleTimeSeries or SingleTimeSeries
        chartOptions: JSON
        finally     : function(timeSeries) (optional) Called when all data are loaded.
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
        return new TimeSeries(options);
    };

    /****************************************************************************
    HistoricalTimeSeries
    Create a historical single line time-series with min, max and mean
    options = {
        container
        parameter   : Parameter
        location    : Location
        series      : []SingleTimeSeries or SingleTimeSeries
        chartOptions: JSON
        finally     : function(timeSeries) (optional) Called when all data are loaded.
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
            let dataGroup = point.dataGroup,
                dataTable = point.series.dataTable,
                group     = [];

            if (dataGroup){
                for (var i=dataGroup.start; i<dataGroup.start + dataGroup.length; i++)
                    group.push(dataTable.getRow(i)[1]);
                group.sort( function(a,b){ return a-b; } );
            }
            else
                group = [point.y];

            //Remove null-values
            group = group.filter(function(value) { return value != null; });

            var minValue  = point.formatValue(group[0]),
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
        return new HistoricalTimeSeries(options);
    };

}(jQuery, this.Highcharts, this.i18next, this.moment, this, document));