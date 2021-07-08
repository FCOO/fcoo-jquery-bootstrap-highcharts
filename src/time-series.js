/****************************************************************************
time-series.js

A time-series chart can by type 1: or 2:

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

(function ($, Highcharts, i18next, moment, window, document, undefined) {
    "use strict";

    //Create fcoo-namespace
    var ns = window.fcoo = window.fcoo || {},
        nsParameter = ns.parameter = ns.parameter || {},
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

    function getColorList(colorGroupIndex){
        var result = [];
        //Set color sequence = Blue, Red, Green, Yellow, Gray,  Purple, Pink, Cyan, Orange
        $.each([0, 2, 7, 5, 8, 1, 6, 4, 3], function(dummy, colorIndex){
            result.push( linkedinPalette[colorGroupIndex][colorIndex]);
        });
        return result;
    }

    //Default color-group = 4
    var defaultColorGroup = 4;
    Highcharts.setOptions({colors: getColorList(defaultColorGroup)});

    function getDeltaColorList(deltaColorGroupIndex){
        return getColorList(defaultColorGroup + deltaColorGroupIndex);
    }

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
    If axis.manRange is set startOnTick and endOnTick is
    also set = true (unless it was set specific to false)
    *********************************************************/
    function axis_tickPositioner(/*min, max*/){
        var dataRange = this.dataMax - this.dataMin;
        if (dataRange > this.options.minRange)
            return this.tickPositions;

        var dataCenter = this.dataMin + dataRange/2,
            minRange = this.options.minRange,
            maxValue = dataCenter + minRange/2,
            minValue = dataCenter - minRange/2,
            maxTickIndex = this.tickPositions.length,
            maxTickDist = Infinity,
            minTickIndex = 0,
            minTickDist = Infinity;

        $.each(this.tickPositions, function(index, tickValue){
            var dist;
            if (tickValue > dataCenter){
                //Find tickIndex with lowest distance to maxValue
                dist = Math.abs(tickValue - maxValue);
                if (dist < maxTickDist){
                    maxTickDist = dist;
                    maxTickIndex = index;
                }
            }
            else {
                dist = Math.abs(tickValue - minValue);
                if (dist < minTickDist){
                    minTickDist = dist;
                    minTickIndex = index;
                }
            }
        });

        return this.tickPositions.slice(minTickIndex, maxTickIndex+1);
    }


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


    /*********************************************************
    Extend Point with method to rotate its marker symbol
    *********************************************************/
    Highcharts.Point.prototype.rotateMarker = function(angle){
        if (!this.graphic || this.isRotated || (angle == undefined))
            return;

        var rad = angle * Math.PI / 180,
            sin = Math.sin(rad),
            cos = Math.cos(rad),
            centerX = this.graphic.attr('imgwidth') / 2,
            centerY = this.graphic.attr('imgheight') / 2,
            newCenterX = centerX * cos - centerY * sin,
            newCenterY = centerX * sin + centerY * cos;

        this.graphic.attr({rotation: angle});
        this.graphic.translate(-newCenterX, -newCenterY);

        this.isRotated = true;

        return this;
    };

    //Rotate all marker in all charts when they load or reset
    Highcharts.addEvent(Highcharts.Chart, 'render', function(event){
        $.each(event.target.series, function(seriesIndex, series){
            $.each(series.data, function(pointIndex, point){
                point.rotateMarker(point.direction);
            });
        });

    });




    /****************************************************************************
    convert-function.
    Every singleTimeSeries (see below) must provide a convert-function that receive
    the data read from a data-file or the data given directly to the SingleTimeSeries-constructor
    and return a object or array with info regarding series-data


    standardConvert
    ****************************************************************************/
    function standardConvert(data){
        return  $.isArray(data) ?
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

            showLegendArrow: BOOLEAN (false).   If true and directionArrow the direction arrow used for a series is shown in the legend.
                                                It is the directionArrow and showLegendArrow of the first sub-series that desides if and what to show in the legend

        Special options:
            color       : NUMBER = index in default color-list (Blue, Red, Green,...)
            deltaColor  : NUMBER is relative to defaultColorGroup (+ = darker - = lighter)
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
            //deltaColor: NUMBER is relative to defaultColorGroup (+ = darker - = lighter)
            o.color = getDeltaColorList(o.deltaColor)[o.color];

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
            $.each(['tooltipPrefix', 'tooltipLabelPrefix', 'tooltipLabelPostfix', 'tooltipValuePrefix', 'tooltipValuePostfix', 'tooltipPostfix'], function(i, id){
                o[id] = o[id] ? $._bsAdjustText(o[id]) : null;
            });

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
                resolve : $.proxy(this.resolve, this)
            };
        },

        /*********************************************************
        resolve - Update the chart with the info returned from the convert-function
        *********************************************************/
        resolve: function(data){
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
                $.each(dataList, function(index, singleDataSet){
                    var timestep, singleData, speed, direction;
                    if (typeof singleDataSet == 'number')
                        return;

                    if (seriesDataOptions.pointStart){
                        // 1: Ok - singleDataSet is SINGLEDATA
                        singleData = singleDataSet;
                    }
                    else
                        //2:, 3:, 4: singleDataSet = [FLOAT, SINGLEDATA]
                        if ($.isArray(singleDataSet) && (singleDataSet.length == 2)){
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
                    if ($.isArray(singleData)){
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

            //this.series is set in TimeSeries.createChart
            this.series.update(seriesDataOptions, false);
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
        finally     : function(timeSeries) (optional) Called when all data are loaded.

        zeroLine    : BOOLEAN (true). If true a thin horizontal line is drawn on y-axis value 0 in the same color as the series
        verticalLines: VERTICALLINE or []VERTICALLINE
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
        var _this = this;

        this.chartOptions = options.chartOptions || {};

        this.chartConstructor = nsHC.chart;
        this.options = $.extend(true, {}, {
            //Default options
            zeroLine: true,
            verticalLines: []

        },
        options);
        this.finally = options.finally || function(){};

        this.parameter = $.isArray(options.parameter) ? options.parameter : [options.parameter];
        $.each(this.parameter, function(index, param){
            _this.parameter[index] = ns.parameter.getParameter(param);
        });
        this.multiParameter = this.parameter.length > 1;

        this.yAxis = this.options.yAxis || this.options.axis || {};
        this.yAxis = $.isArray(this.yAxis) ? this.yAxis : [this.yAxis];

        var unitList = options.unit ? ($.isArray(options.unit) ? options.unit : [options.unit]) : [];
        $.each(this.parameter, function(index, param){
            if (unitList.length > index){
                //Clone the parameter and set it to use the new unit
                var unit = nsParameter.getUnit(unitList[index]),
                    decimals = Math.max(0, param.decimals + Math.round(Math.log10(unit.SI_factor/param.unit.SI_factor))),
                    clonedParam =  _this.parameter[index] = $.extend(true, {}, param);
                clonedParam.decimals = decimals;
                clonedParam.unit = unit;

                //If the parameter is a vector => clone the speed-parameter with new unit
                if (clonedParam.type == 'vector'){
                    var speedParam = clonedParam.speed_direction[0] = $.extend(true, {}, clonedParam.speed_direction[0]);
                    speedParam.decimals = decimals;
                    speedParam.unit = unit;
                }
            }
        });

        this.z = options.z || null;

        options.location = options.location || '';
        this.location  = $.isArray(options.location)  ? options.location  : [options.location];
        this.locationName = [];
        $.each(this.location, function(index, loc){
            _this.locationName[index] = loc ? $._bsAdjustIconAndText(loc).text : '';
        });
        this.multiLocation = this.location.length > 1;

        this.singleSingle = !this.multiParameter && !this.multiLocation;

        this.series    = [];  //= [] of the main series
        this.subSeries = [];  //= [] of the sub series. If a series contains of multi series the first is added to this.series and the rest to subSeries with link to legend and axis for the first series

        this.anyHasTooltip  = false; //true if at least one series has tooltip. Is updated when a series is added using this._createSingleTimeSeries
        this.allHaveTooltip = true;  //true if ALL series have tooltip. Is updated when a series is added using this._createSingleTimeSeries


        $.each($.isArray(options.series)  ? options.series : [options.series], function(index, seriesOptions){

            //If seriesOptions is an array => it contains list of series-options where [0] is the main and [1..N] if sub-series linked to the main seriesdata for a single series, else opt is a multi series
            if ($.isArray(seriesOptions)){
                var mainSingleTimeSeries = _this._createSingleTimeSeries(seriesOptions[0], index);
                _this.series.push(mainSingleTimeSeries);

                //Add the rest as sub series
                $.each(seriesOptions, function(subIndex, subSeriesOptions){
                    if (subIndex)
                        _this.subSeries.push( _this._createSingleTimeSeries(subSeriesOptions, index, mainSingleTimeSeries) );
                });
            }
            else
                _this.series.push( _this._createSingleTimeSeries(seriesOptions, index) );
        });
    }

    BaseTimeSeries.prototype = {
        //**********************************************
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
                noTooltip : false
            }, options);

            //Create the SingleTimeSeries
            var singleTimeSeries = new SingleTimeSeries(options);
            singleTimeSeries.index = index;
            singleTimeSeries.timeSeries = this;
            singleTimeSeries.parameter  = this.multiParameter ? this.parameter[index] : this.parameter[0];
            singleTimeSeries.location   = this.multiLocation  ? this.location[index]  : this.location[0];


            this.anyHasTooltip = this.anyHasTooltip || !options.noTooltip;
            if (options.noTooltip)
                this.allHaveTooltip = false;

            return singleTimeSeries;
        },

        //**********************************************
        _tooltip_get_fix: function(point){
            var result = {};
            $.each(['Prefix', 'Postfix'], function(index, position){
                $.each(['', 'Label', 'Value'], function(index2, subId){
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

            return  `<tr>
                        <td class="chart-tooltip-name" style="color:${this.color}">
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

        //**********************************************
        _finally: function(){},

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
        createChart: function(){
            var _this = this,
                chartOptions = this.chartOptions;

            //Title
            if (this.options.noTitle)
                this.set('title.text', '');
            else {
                if (this.multiParameter || this.singleSingle)
                    this.set('title.text', this.locationName[0]);
                else
                    this.set('title.text', this.parameter[0].decodeGetName(true, false, this.z));
            }

            //Sub-title = paramter-name if only one location and one paramter
            if (this.singleSingle){
                if (!this.options.noSubTitle)
                    this.set('subtitle', this.parameter[0].hcOptions_axis_title(this.z));

                this.set('legend.enabled', false);
            }
            else
                //Legend centered at top
                this.set('legend', {
                    align        : 'center',
                    borderWidth  : 0,
                    enabled      : !this.options.noLegend,
                    margin       : 0,
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
            $.each( $.isArray(verLineList) ? verLineList : [verLineList], function(index, lineOptions){
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
                chartOptions.tooltip = this.parameter[0].hcOptions_series_tooltip('', this.z);

                $.extend(chartOptions.tooltip, this.options.tooltip || {});

                this.set('tooltip.shared', true);
                this.set('tooltip.split', false);

                this.set('tooltip.borderColor', '#868e96'); //Hard-coded from jquery-bootstrap!
                this.set('tooltip.borderRadius', 8);

                this.set('tooltip.headerFormat', '<span class="chart-tooltip-time">{point.key}</span><table class="chart-tooltip-table">');
                if (this.singleSingle && !this.options.alwaysShowParameter){
                    //Single location and paramater
                    this.set('tooltip.pointFormatter', function(){
                        return _this._tooltip_pointFormatter_single.call(this, _this);
                    });
                }
                else {
                    //Display multi paramater or location in a table to have correct align
                    this.set('tooltip.pointFormatter', function(){
                        return _this._tooltip_pointFormatter_multi.call(this, _this);
                    });
                }
                this.set('tooltip.footerFormat', '</table>');

                if (!this.allHaveTooltip){
                    //Check if the current series has tooltip and hide it if not
                    this.set('tooltip.formatter', function(tooltip){
                        var points = this.point ? [this.point] : this.points || [],
                            showTooltip = false;

                        $.each(points, function(index, point){
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
            var seriesAxisIndex = [], nextAxis;

            if ((this.multiLocation || this.singleSingle) && !this.options.alwaysShowParameter){
                nextAxis = {
                    crosshair   : true,
                    opposite    : false,
                    labels      : this.parameter[0].hcOptions_axis_labels(),
                    title       : {enabled: false}
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
                seriesAxisIndex = Array(this.location.length).fill(0);
            }
            else {
                //The y-axis for multi-parameter is added in a order to have the y-axis in the same order (left to rigth) as the series legned
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
                    var color = _this.series[index].getChartOptions().color,
                        style = {color: color};

                    nextAxis = {
                        lineColor: color,
                        lineWidth: 1,

                        opposite: index > leftAxisIndex,
                        title: {
                            text: parameter.decodeGetName(true, true, _this.z),
                            style: style
                        },
                        labels: {
                            formatter: parameter.hcOptions_axis_labels_formatter(),
                            style: style
                        }
                    };

                    if (_this.options.zeroLine && parameter.negative)
                        nextAxis.plotLines = [{
                            color: color,
                            width: 2,
                            value: 0
                        }];
                    if (!parameter.negative)
                        nextAxis.min = 0;

                    //Replace the index-number in yAxis with the axis-options
                    chartOptions.yAxis[ seriesAxisIndex[index] ] = nextAxis;
                });
            }

            //Update yAxis with other options
            $.each(this.yAxis, function(index, options){
                if (index < chartOptions.yAxis.length)
                    chartOptions.yAxis[ seriesAxisIndex[index] ] = $.extend(true, chartOptions.yAxis[seriesAxisIndex[index]], options);
            });

            //Update all yAxis with default options
            $.each(chartOptions.yAxis, function(index, options){
                //Set the options needed to get a better minRange.
                //See function axis_tickPositioner at the top
                if (options.minRange){
                    options.startOnTick = options.startOnTick === undefined ? true : options.startOnTick;
                    options.endOnTick   = options.endOnTick   === undefined ? true : options.endOnTick;
                    options.tickPositioner = options.tickPositioner || axis_tickPositioner;
                }
            });

            //Name of series
            chartOptions.series = [];
            if (this.multiParameter || this.singleSingle)
                $.each(this.parameter, function(index, parameter){
                    chartOptions.series.push({
                        name         : parameter.decodeGetName(true, false, _this.z),
                        nameInTooltip: parameter.decodeGetName(false, false/*true*/, _this.z), //<- Changed 2021-06-10 to show vector-name instead of speed-name
                        yAxis        : seriesAxisIndex[index],
                        tooltip      : parameter.hcOptions_series_tooltip('', _this.z)
                    });
                });
            else {
                $.each(this.locationName, function(index, location){
                    chartOptions.series.push({name: location});
                });
            }

            //Set style and id for the added series
            $.each(chartOptions.series, function(index, seriesOptions){
                chartOptions.series[index] = $.extend(true, seriesOptions, _this.series[index].getChartOptions());
                chartOptions.series[index].id =  'fcoo_series_' + index;
            });

            //Add sub series
            $.each(this.subSeries, function(subSeriesIndex, singleTimeSeries/*opt*/){
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
            $.each(this.series, function(index, singleTimeSeries){
                if (singleTimeSeries.options.directionArrow && !singleTimeSeries.options.showLegendArrow){
                    anySeriesNeedToHideArrow = true;
                    singleTimeSeries.options.hideLegendArrow = true;
                }
            });

            if (anySeriesNeedToHideArrow)
                this.set('chart.events.render', function(){
                    $.each(_this.series, function(index, singleTimeSeries){
                        if (
                            singleTimeSeries.options.hideLegendArrow &&
                            singleTimeSeries.series &&
                            singleTimeSeries.series.legendSymbol &&
                            singleTimeSeries.series.legendSymbol.element
                        )
                            singleTimeSeries.series.legendSymbol.element.style.display = 'none';
                    });
                });


            /****************************************
            Create the chart
            ****************************************/
            var chart = this.chart = this.chartConstructor(this.options.container, this.chartOptions);
            chart.fcooTimeSeries = this;

            //Load data
            chart.promiseList = new window.PromiseList({
                finish: function(){
                    _this.finally(_this);

                    chart.redraw(false);

                    _this._finally();

                }
            });

            //Link Series and SingleTimeSeries
            $.each(this.series, function(index, singleTimeSeries){
                singleTimeSeries.series = chart.series[index];
                singleTimeSeries.series.userOptions.singleTimeSeries = singleTimeSeries;

                chart.promiseList.append( singleTimeSeries.promiseListOptions() );
            });
            var thisSeriesLength = this.series.length;
            $.each(this.subSeries, function(index, singleTimeSeries){
                singleTimeSeries.series = chart.series[thisSeriesLength + index];
                singleTimeSeries.series.userOptions.singleTimeSeries = singleTimeSeries;

                chart.promiseList.append( singleTimeSeries.promiseListOptions() );
            });

            chart.promiseList.promiseAll();
            return chart;
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
        return (new TimeSeries(options)).createChart();
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
            var dataGroup = point.dataGroup,
                series = point.series,
                group = dataGroup ?
                            series.yData.slice(
                                dataGroup.start,
                                dataGroup.start + dataGroup.length
                            ).sort( function(a,b){ return a-b; } ) :
                        [point.y];

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
        return (new HistoricalTimeSeries(options)).createChart();
    };

}(jQuery, this.Highcharts, this.i18next, this.moment, this, document));