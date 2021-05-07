/****************************************************************************
	fcoo-jquery-bootstrap-highcharts.js,

	(c) 2021, FCOO

	https://github.com/FCOO/fcoo-jquery-bootstrap-highcharts
	https://github.com/FCOO


DEMO FOR INSPIRATIONS
Wind distribution: https://www.highcharts.com/demo/polar-wind-rose

Single parameter from one or more places with color-band (from the scale): https://www.highcharts.com/demo/spline-plot-bands

Single parameter with range: https://www.highcharts.com/demo/arearange-line and https://www.highcharts.com/demo/stock/arearange

Sync between multi charts: https://www.highcharts.com/demo/synchronized-charts

Heat map / depth-time plot: https://www.highcharts.com/demo/heatmap-canvas

Meteorogram: https://www.highcharts.com/demo/combo-meteogram#https://www.yr.no/place/United_Kingdom/England/London/forecast_hour_by_hour.xml

****************************************************************************/

(function ($, Highcharts, i18next, moment, window/*, document, undefined*/) {
	"use strict";

	//Create fcoo-namespace
    var ns = window.fcoo = window.fcoo || {},
        nsHC = ns.hc = ns.highcharts = ns.highcharts || {};


    /*********************************************************
    Translate all charts when language changed
    *********************************************************/
    ns.events.on('LANGUAGECHANGED', function(id, lang){
        if (id == 'language')
            Highcharts.onLanguageChanged(lang, false);
    });
    //Other global events = 'TIMEZONECHANGED', 'DATETIMEFORMATCHANGED', 'NUMBERFORMATCHANGED', 'LATLNGFORMATCHANGED', 'UNITCHANGED'


    /*********************************************************
    Extend dateFormats with formats for range
    See https://api.highcharts.com/highstock/rangeSelector.buttons.dataGrouping.dateTimeLabelFormats

    Highcharts uses the following keys in dateFormats
    `%a`: Short weekday, like 'Mon'
    `%A`: Long weekday, like 'Monday'
    `%d`: Two digit day of the month, 01 to 31
    `%e`: Day of the month, 1 through 31
    `%w`: Day of the week, 0 through 6
    `%b`: Short month, like 'Jan'
    `%B`: Long month, like 'January'
    `%m`: Two digit month number, 01 through 12
    `%y`: Two digits year, like 09 for 2009
    `%Y`: Four digits year, like 2009
    `%H`: Two digits hours in 24h format, 00 through 23
    `%k`: Hours in 24h format, 0 through 23
    `%I`: Two digits hours in 12h format, 00 through 11
    `%l`: Hours in 12h format, 1 through 12
    `%M`: Two digits minutes, 00 through 59
    `%p`: Upper case AM or PM
    `%P`: Lower case AM or PM
    `%S`: Two digits seconds, 00 through 59
    `%L`: Milliseconds (naming from Ruby)
    *********************************************************/
    function timestampToMoment(timestamp){
        return moment(timestamp).tzMoment();
    }

    function dateTimeFormat(timestamp, inclYear, inclTime, notFirst){
        var m      = timestampToMoment(timestamp),
            result = m[inclTime ? 'dateTimeFormat' : 'dateFormat']({dateFormat: {weekday:'None', month:'Short', year:inclYear?'Full':'None'}});
        return notFirst ? result : result.charAt(0).toUpperCase() + result.slice(1);
    }

    function weekFormat(timestamp, inclText, inclYear){
        var m = timestampToMoment(timestamp);
        return (inclText ? i18next.s({da:'Uge', en:'Week'}) + ' ' : '') + m.week() + (inclYear ? '/' + m.year() : '');
    }

    Highcharts.dateFormats = $.extend(Highcharts.dateFormats, {
        //range[NAME] used by rangeSelector

        //rangeMillisecond  : TODO. Using default now
        //rangeSecond       : TODO. Using default now
        //rangeMinute       : TODO. Using default now

        rangeHourOne    : function(timestamp){ return                 dateTimeFormat(timestamp, true, true, false); },
        rangeHourFrom   : function(timestamp){ return                 dateTimeFormat(timestamp, true, true, false); },
        rangeHourTo     : function(timestamp){
            //Change the range from hh:59 to hh:00
            var endMoment = timestampToMoment(timestamp);
            endMoment.floor(1, 'hours');
            return '&nbsp;-&nbsp;'+endMoment.timeFormat(); },

        //Day-range check for date-format = YMD or DMY/MDY to deside where the year is placed in day-range: DMY: 12. may - 14. may 2021 or YMD: 2021 May 12. - May 14.
        rangeDayOne     : function(timestamp){ return                 dateTimeFormat(timestamp, true, false, false); },
        rangeDayFrom    : function(timestamp){ return                 dateTimeFormat(timestamp, moment.sfGetOptions().date == 'YMD', false, false); },
        rangeDayTo      : function(timestamp){ return '&nbsp;-&nbsp;'+dateTimeFormat(timestamp, moment.sfGetOptions().date != 'YMD', false, true);  },


        rangeWeekOne    : function(timestamp){ return       weekFormat(timestamp, true, true);  },
        rangeWeekFrom   : function(timestamp){ return       weekFormat(timestamp, true, false); },
        rangeWeekTo     : function(timestamp){ return '-' + weekFormat(timestamp, false, true); },
    });

    /*********************************************************
    Set default FCOO options for chart and stockChart
    *********************************************************/
    var defaultChartOptions = {
            /*  alignTicks: boolean
                When using multiple axis, the ticks of two or more opposite axes will automatically be aligned by adding ticks to the axis or axes with the least ticks, as if tickAmount were specified.

                This can be prevented by setting alignTicks to false. If the grid lines look messy, it's a good idea to hide them for the secondary axis by setting gridLineWidth to 0.

                If startOnTick or endOnTick in an Axis options are set to false, then the alignTicks will be disabled for the Axis.
            */
            alignTicks: false,

            container: {
                css: {
                    width : '100%',
                    height: '100%'
                }
            },

            credits: {
                enabled: false
            },

            exporting: {
                fallbackToExportServer: true,
                error:  function(/*options, error*/){
                    window.notyError({da:'Fejl', en:'Error'}, {defaultHeader: false});
                },
                buttons: {
                    contextButton: {
                        menuItems: ["viewFullscreen", "separator", "printChart", "separator", "downloadPNG", "downloadJPEG", "downloadPDF", "downloadSVG"]
                    }
                },
                //url: '', //The URL for the server module converting the SVG string to an image format. By default this points to Highchart's free web service = https://export.highcharts.com/.
            },

            plotOptions: {
                series: {
                    //pointWidth: undefined,    //A pixel value specifying a fixed width for each column or bar point.
                                                //When set to undefined, the width is calculated from the pointPadding and groupPadding.
                                                //The width effects the dimension that is not based on the point value. For column series it is the hoizontal length and for bar series it is the vertical length.
                }
            },

            title: {
                margin: 6
            },

            tooltip: {
                useHTML: true,
                style: {
                    fontSize: '11px'
                }
            },
        },

        defaultStockChartOptions = {
            plotOptions: {
                series: {
                    showInNavigator: true
                }
            },

            rangeSelector: {
                enabled : true,
                dropdown: 'responsive',

                inputEnabled        : true,
                inputDateFormat     : "%d %m %Y",
                inputEditDateFormat : "%d %m %Y",

                buttonTheme   : {width: 48},
                buttonPosition: {align: 'middle'},

                buttons : ['3 d', '1 w', '1 m', '6 m', '1 y'],
                selected: 3,

                verticalAlign: 'bottom'
            }
        },

        defaultDataGrouping = {
            enabled         : true,
            forced          : false,    //When data grouping is forced, it runs no matter how small the intervals are. This can be handy for example when the sum should be calculated for values appearing at random times within each hour.
            groupAll        : false,
            smoothed        : false,
            approximation   : "average",    //"average", //"average", "averages", "open", "high", "low", "close", "sum" or function([]NUMBER) return NUMBER
            groupPixelWidth: 10,            //The approximate pixel width of each group. If for example a series with 30 points is displayed over a 600 pixel wide plot area, no grouping is performed.
                                            //If however the series contains so many points that the spacing is less than the groupPixelWidth, Highcharts will try to group it into appropriate groups
                                            //so that each is more or less two pixels wide. Defaults to 10.

            dateTimeLabelFormats: {
                //millisecond : TODO. Using default now
                //second      : TODO. Using default now
                //minute      : '%rangeMinute',
                hour   : ['%rangeHourOne', '%rangeHourFrom', '%rangeHourTo'],
                day    : ['%rangeDayOne',  '%rangeDayFrom',  '%rangeDayTo' ],
                week   : ['%rangeWeekOne', '%rangeWeekFrom', '%rangeWeekTo'],
                month  : ['%b %Y', '%b', '-%b %Y'],
                year   : ['%Y', '%Y', '-%Y']
            },

            //units: See https://api.highcharts.com/highstock/series.line.dataGrouping.units
            //units = An array determining what time intervals the data is allowed to be grouped to. Each array item is an array where the first value is the time unit and the second value another array of allowed multiples.
            units: [
                //Unit name allowed multiples
                ['hour',    [1, 2, 3, 4, 6, 12] ],
                ['day',     [1, 2, 3]           ],
                ['week',    [1, 2, 3]           ],
                ['month',   [1, 2, 3, 4, 6]     ]
            ]
        };

    /*********************************************************
    chart_onResize: handle resize of container
    Save the current dim of the container and set a timeout to
    check if the dim is changed => the chart has redrawn itself
    *********************************************************/
    function chart_onResize(){
        this._save_containerWidth = this.containerWidth;
        this._save_containerHeight = this.containerHeight;

        window.clearTimeout(this._resize_timeout_id);
        this._resize_timeout_id = window.setTimeout( $.proxy( function(){
            if (
                    ( Math.round(this.$outerContainer.width()  ) != Math.round(this.containerWidth ) ) ||
                    ( Math.round(this.$outerContainer.height() ) != Math.round(this.containerHeight) )
               ){
                //The outer-container has resized but the chart has not
                this.reflow();
            }
        }, this), 100);
    }

    /*********************************************************
    Extend Chart.destroy to also remove resize-event from is container
    *********************************************************/
    Highcharts.Chart.prototype.destroy = function (Chart_destroy) {
        return function(){
            if (this.$outerContainer && this._fcoo_onResize)
                this.$outerContainer.removeResize(this._fcoo_onResize);

            var $innerContainer = this.$innerContainer,
                result = Chart_destroy.apply(this, arguments);

            if ($innerContainer)
                $innerContainer.remove();

            return result;
        };
    }(Highcharts.Chart.prototype.destroy);


    /*********************************************************
    createHighchar(chartConstructor, options, []options, adjustOptionsFunc)
    Adjust the options with defaultChartOptions and optionsList
    Adjust the options using adjustOptionsFunc (if any)
    Create a inner container with options.container.css and options.container.className
    Create the chart using chartConstructor
    *********************************************************/
    function createHighchart(chartConstructor, container, callback, options, optionsList = [], adjustOptionsFunc = function(opt){return opt;}){
        optionsList = $.isArray(optionsList) ? optionsList : [optionsList];
        optionsList.push(defaultChartOptions, options);

        var chartOptions = {};

        $.each(optionsList, function(index, opt){
            chartOptions = $.extend(true, chartOptions, opt);
         });
        chartOptions = adjustOptionsFunc(chartOptions);

        //Create a inner-container inside container to allow resize-events on the container
        var $innerContainer = $('<div></div>').addClass('chart-inner-container').appendTo(container);
        if (options.container){
            $innerContainer.css(options.container.css);
            $innerContainer.addClass(options.container.className);
        }

        //Create the chart
        var chart = chartConstructor($innerContainer.get(0), chartOptions, callback);

        chart.$innerContainer = $innerContainer;
        chart.$outerContainer = $(container);

        //Add events to update chart on container resize
        chart._fcoo_onResize = $.proxy(chart_onResize, chart);
        chart.$outerContainer.resize( chart._fcoo_onResize );

        return chart;
    }

    /*********************************************************
    fcoo.highcharts.chart(container, options, callback)
    *********************************************************/
    nsHC.chart = function(container, options, callback) {
        return createHighchart(Highcharts.chart, container, callback, options);
    };

    /*********************************************************
    fcoo.highcharts.stockChart(container, options, callback)
    *********************************************************/
    nsHC.stockChart = function(container, options, callback) {
        return createHighchart(Highcharts.stockChart, container, callback, options, defaultStockChartOptions,
            function(opt){
                //options.rangeSelector.buttons is allowed to be []STRING i format "X UNIT" ("3 day")
                //UNIT = ms=millisecond, s=second, mi=minute, h=hour, d=day, w=week, M=month, y=year, ytd=ytd, and a=all (auto added)
                if (opt.rangeSelector && opt.rangeSelector.enabled){
                    $.each(opt.rangeSelector.buttons, function(index, buttonOptions){
                        if ($.type(buttonOptions) == 'string'){
                            buttonOptions = buttonOptions.split(' ');
                            var count    = parseInt(buttonOptions[0]),
                                pluralist = count > 1,
                                typeCode = buttonOptions[1],
                                newOptions = {
                                    type : {ms:'millisecond', s:'second', mi:'minute', h:'hour', d:'day', w:'week', m:'month',y:'year'}[typeCode],
                                    count: count
                                };

                            switch(typeCode) {
                                case "ms": newOptions.text = {da: 'ms',  en:'ms' }; break;
                                case "s" : newOptions.text = {da: 'sek', en:'sec'}; break;
                                case "mi": newOptions.text = pluralist ? {da: 'min', en:'mins'   } : {da:'min', en:'min' }; break;
                                case "h" : newOptions.text = pluralist ? {da: 'timer', en:'hrs'  } : {da:'time', en:'hour' }; break;
                                case "d" : newOptions.text = pluralist ? {da: 'dage',  en:'days' } : {da:'dag',  en:'day'  }; break;
                                case "w" : newOptions.text = pluralist ? {da: 'uger',  en:'wks'  } : {da:'uge',  en:'week' }; break;
                                case "m" : newOptions.text = pluralist ? {da: 'mdr',   en:'mths' } : {da:'mdr',  en:'mth'  }; break;
                                case "y" : newOptions.text = pluralist ? {da: 'år',    en:'yr'   } : {da:'år',   en:'year' }; break;
                            }

                            $.each(newOptions.text, function(lang, text){
                                newOptions.text[lang] = count+' '+text;
                            });

                            opt.rangeSelector.buttons[index] = newOptions;
                        }
                    });

                    opt.rangeSelector.buttons.push({
                        type: 'all',
                        text: {da:'Alt', en:'All'}
                    });
                }

                //Update serie-options with default
                $.each(opt.series, function(index, serie){
                    opt.series[index].dataGrouping = $.extend(true, {}, defaultDataGrouping, serie.dataGrouping || {});
                });

                return opt;
            }
        );
    };

}(jQuery, this.Highcharts, this.i18next, this.moment, this, document));
;
/****************************************************************************
fcoo-jquery-bootstrap-highcharts-parameter.js

Extend Parameter-object from fcoo-parameter-unit to interact with Highchart
****************************************************************************/

(function ($, Highcharts, window/*, document, undefined*/) {
	"use strict";

	//Create fcoo-namespace
    var ns = window.fcoo = window.fcoo || {},
        //nsHC = ns.hc = ns.highcharts = ns.highcharts || {};
        nsParameter = ns.parameter = ns.parameter || {};

    //Methods to convert html-text to 'pure' text

    var $div = $('<div/>');
    //decode: Return text with all html-char replaced with the real char. E.q. &deg; => °
    function decodeText(text, prefix='', postfix=''){
        return prefix + $div.html(text).text() + postfix;
    }

    function decode(obj, prefix, postfix){
        if (typeof obj == 'string')
            return decodeText(obj, prefix, postfix);

        var newObj = $.extend(true, {}, obj);
        $.each(newObj, function(lang, text){
            newObj[lang] = decodeText(text, prefix, postfix);
        });
        return newObj;
    }

    /********************************************
    Extend Unit with methods to get Highchart options
    ********************************************/
    $.extend(nsParameter.Unit.prototype, {
        decodeGetName: function(inclSpace){
            return decode(this.name, inclSpace && !this.noSpace ? ' ' : '');
        }
    });

    /********************************************
    Extend Parameter with methods to get Highchart options
    ********************************************/
    $.extend(nsParameter.Parameter.prototype, {
        decodeGetName: function(inclUnit, useSpeedParameter, z){
            var param = this;
            if (useSpeedParameter && (this.speed_direction.length > 0))
                param = this.speed_direction[0];
            return decode( param.getName(inclUnit, z) );
        },

        //hcOptions_XX: Return options for given part of options for charts
        hcOptions_axis_title: function(z){
            return {
                text: this.decodeGetName(true, false, z) //decodeGetName(inclUnit, useSpeedParameter, z)
            };
        },

        //tooltip for single serie
        hcOptions_series_tooltip: function(valuePrefix = '', z){
            return {
                valueDecimals: this.decimals,
                valuePrefix  : valuePrefix,
                valueSuffix  : this.unit.decodeGetName(true, z)
            };
        },

        //Set decimals on axis labels equal as parameter
        hcOptions_axis_labels_formatter: function(){
            var valueFormat = this.decimals ? '0,0.' + '0'.repeat(this.decimals) : '0,0';
            return function(){
                return window.numeral( this.value ).format( valueFormat );
            };
        },

        hcOptions_axis_labels: function(){
            return {
                formatter: this.hcOptions_axis_labels_formatter()
            };
        }

    });


}(jQuery, this.Highcharts, this, document));
;
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

(function ($, Highcharts, i18next, moment, window/*, document, undefined*/) {
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
    Fix to allow more than two series linked together being highlighted when hover
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
    */



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
    Every singleTimeSeries (see below) must provide a convert-function that receive
    the data read from a data-file or the data given directly to the SingleTimeSeries-constructor
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
    function standardConvert(data/*, singleTimeSeries*/){
        return {
            data         : data.data || this.data,
            pointStart   : data.start || data.pointStart || this.start,
            pointInterval: data.interval || data.pointInterval || this.interval
        };
    }

    /****************************************************************************
    SingleTimeSeries
    A object used to set style and load data for a single time-series or time-range-series and convert in into the right HC-format.
    It is possible to have one timeserie containing multi data-series.

    DATAOPTIONS = options for one set of data. It could be all the data for a serei or part of the series

    1: DATAOPTIONS = {
        start   : STRING. Moment-string
        interval: STRING. Moment-duration
        data    : []FLOAT
    }

    or

    2: DATAOPTIONS = {
        data: [][FLOAT, FLOAT]
    }

    or

    3: DATAOPTIONS = [][FLOAT, FLOAT]

    or

    4: DATAOPTIONS = {
        fileName: STRING or {mainDir:STRING|BOOLEAN, subDirName:STRING, fileName:STRING} See fcoo-data-files
        convert : FUNCTION(data, singleTimeSeries): Convert data into the correct format in SingleTimeSeries
    }



    SingleTimeSeries(options) where
    options = DATAOPTIONS or options = []DATAOPTIONS
    ****************************************************************************/
    var SingleTimeSeries = function(options){


        this.start      = options.start || null;
        this.interval   = options.interval || null;
        this.data       = options.data || null;

        this.fileName   = options.fileName || null;
        this.convert    = options.convert || standardConvert;

//HER        this.tooltipPrefix  = options.tooltipPrefix;
//HER        this.tooltipPostfix = options.tooltipPostfix;
//HERconsole.log(this.tooltipPrefix);
    };

    SingleTimeSeries.prototype = {
        promiseListOptions: function(){
            return {
                fileName: this.fileName ? ns.path.dataFileName(this.fileName) : null,
                data    : this.data,
                resolve : $.proxy(this.resolve, this)
            };
        },

        //Update the chart with the info returned from the convert-function
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
        series      : []SingleTimeSeries or SingleTimeSeries
        styles      : Same array structure as series with SERIESTYLE
        chartOptions: JSON
        finally     : function(timeSeries) (optional) Called when all data are loaded.
    }
    SERIESTYLE = {
        color       : NUMBER = index in default color-list (Blue, Red, Green,...)
        deltaColor  : NUMBER is relative to defaultColorGroup (+ = darker - = lighter)
        marker      : true, STRING, false. true: Next default marker, false: no marker
        noTooltip   : BOOLEAN. When true the series do not have a tooltip

        lineWidth   : NUMBER
        dashStyle   : STRING Default = 'Solid' See https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/series-dashstyle-all/
                      Possible values: 'Solid','ShortDash','ShortDot','ShortDashDot','ShortDashDotDot','Dot','Dash','LongDash','DashDot','LongDashDot','LongDashDotDot'
    }
    ****************************************************************************/
    function BaseTimeSeries(options){
        var _this = this;

        this.chartOptions = options.chartOptions || {};

        this.chartConstructor = nsHC.chart;
        this.options = options;
        this.finally = options.finally || function(){};

        this.parameter = $.isArray(options.parameter) ? options.parameter : [options.parameter];
        $.each(this.parameter, function(index, param){
            _this.parameter[index] = ns.parameter.getParameter(param);
        });
        this.multiParameter = this.parameter.length > 1;

        var unitList = options.unit ? ($.isArray(options.unit) ? options.unit : [options.unit]) : [];
        $.each(this.parameter, function(index, param){
            if (unitList.length > index){
                //Clone the parameter and set it to use the new unit
                var unit = nsParameter.getUnit(unitList[index]),
                    decimals = Math.max(0, param.decimals + Math.round(Math.log10(unit.SI_factor/param.unit.SI_factor)));
                _this.parameter[index] = $.extend(true, {}, param);
                _this.parameter[index].decimals = decimals;
                _this.parameter[index].unit = unit;
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

        var styles = options.styles || {};
        styles = $.isArray(styles) ? styles : [styles];

        $.each($.isArray(options.series)  ? options.series : [options.series], function(index, opt){
            var style = styles[index] || {};

            //If opt is an array => check if it is a list of sub-series. If first element is a [FLOAT, FLOAT] => opt is data for a single series, else opt is a multi series
            if ($.isArray(opt)){
                var first = opt[0],
                    styleList = $.isArray(style) ? style : [style];

                if ($.isArray(first) && (first.length == 2) && (typeof first[1] == 'number'))
                    // opt is a array with data for one series
                    _this.series.push( _this._createSingleTimeSeries({data: opt}, index, styleList[0]) );
                else {
                    //The dataset contains multi sub sets. The first sub set is added as primary set ande the rest is added as sub set => Add first set as main
                    var mainSingleTimeSeries = _this._createSingleTimeSeries(opt[0], index, styleList[0]);
                    _this.series.push(mainSingleTimeSeries);

                    //Add the rest as sub series
                    $.each(opt, function(subIndex, subOpt){
                        if (subIndex)
                            _this.subSeries.push( _this._createSingleTimeSeries(subOpt, index, styleList[subIndex], mainSingleTimeSeries.style) );
                    });
                }
            }
            else
                _this.series.push( _this._createSingleTimeSeries(opt, index, style) );
        });
    }

    BaseTimeSeries.prototype = {
        //**********************************************
        _createSingleTimeSeries(options, index, style = {}, siblingStyle = {}){
            options = $.isArray(options) ? {data: options} : options;

            var singleTimeSeries = new SingleTimeSeries(options);

            singleTimeSeries.index = index;
            singleTimeSeries.timeSeries = this;
            singleTimeSeries.parameter  = this.multiParameter ? this.parameter[index] : this.parameter[0];
            singleTimeSeries.location   = this.multiLocation  ? this.location[index]  : this.location[0];

            var s = singleTimeSeries.style = $.extend(true, {
                //Default series style
                color     : index,
                deltaColor: 0,
                marker    : true,
                lineWidth : 1,
                dashStyle : 'Solid',
                noTooltip : false
            }, siblingStyle, style);

            //seriesStyle = Adjusted style for the series
            var ss = singleTimeSeries.seriesStyle = {
                color    : getDeltaColorList(s.deltaColor)[s.color],
                lineWidth: s.lineWidth,
                dashStyle: s.dashStyle,
                marker   : {
                    enabled: !!s.marker,
                    symbol : ''
                },
                noTooltip       : !!s.noTooltip,
                tooltipPrefix   : s.tooltipPrefix  ? $._bsAdjustText( s.tooltipPrefix  ) : null,
                tooltipPostfix  : s.tooltipPostfix ? $._bsAdjustText( s.tooltipPostfix ) : null
            };

            if (s.marker){
                var symbolList = Highcharts.getOptions().symbols;
                ss.marker.symbol = s.marker === true ? symbolList[index % symbolList.length] : s.marker;
            }

            ss.marker.states = {hover: {enabled: !!s.marker || !s.noTooltip}};

            this.anyHasTooltip = this.anyHasTooltip || !s.noTooltip;
            if (s.noTooltip)
                this.allHaveTooltip = false;

            return singleTimeSeries;
        },

        //**********************************************
        _tooltip_get_prefix: function(point, id = 'Prefix'){
            var value = point.series.options['tooltip'+id];
            return value ? i18next.s(value) : '';
        },
        _tooltip_get_postfix: function(point){
            return this._tooltip_get_prefix(point, 'Postfix');
        },


        //_tooltip_pointFormatter_single - called with this == Point
        _tooltip_pointFormatter_single: function(timeSeries){
            if (this.series.options.noTooltip)
                return '';
            return  `<tr>
                        <td class="chart-tooltip-value">` +
                            timeSeries._tooltip_get_prefix(this) +
                            timeSeries.valueFormatter(this)  +
                            timeSeries._tooltip_get_postfix(this) +
                        `</td>
                    </tr>`;
        },

        //_tooltip_pointFormatter_multi - called with this == Point
        _tooltip_pointFormatter_multi: function(timeSeries){
            if (this.series.options.noTooltip)
                return '';

            var prefix    = timeSeries._tooltip_get_prefix(this),
                serieName = i18next.s( $._bsAdjustText( timeSeries.multiLocation ? this.series.name : this.series.options.nameInTooltip ) ),
                postfix   = timeSeries._tooltip_get_postfix(this);
            return  `<tr>
                        <td class="chart-tooltip-name" style="color:${this.color}">
                            ${prefix}${serieName}${postfix}&nbsp;
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
            if (this.multiParameter || this.singleSingle)
                this.set('title.text', this.locationName[0]);
            else
                this.set('title.text', this.parameter[0].decodeGetName(true, false, this.z));

            //Sub-title = paramter-name if only one location and one paramter
            if (this.singleSingle){
                this.set('subtitle', this.parameter[0].hcOptions_axis_title(this.z));
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
            this.set('tooltip.enabled', this.anyHasTooltip);
            if (this.anyHasTooltip){
                //Set common tooltip for single parameter-mode (in multi-parameter mode the tooltip is set pro series
                chartOptions.tooltip = this.parameter[0].hcOptions_series_tooltip('', this.z);

                this.set('tooltip.shared', true);
                this.set('tooltip.split', false);

                this.set('tooltip.borderColor', '#868e96'); //Hard-coded from jquery-bootstrap!
                this.set('tooltip.borderRadius', 8);

                this.set('tooltip.headerFormat', '<span class="chart-tooltip-time">{point.key}</span><table class="chart-tooltip-table">');
                if (this.singleSingle){
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
                    var color = _this.series[index].seriesStyle.color,
                        style = {color: color},
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

                    //Replace the index-number in yAxis with the axis-options
                    chartOptions.yAxis[ seriesAxisIndex[index] ] = nextAxis;
                });
            }

            //Name of series
            chartOptions.series = [];
            if (this.multiParameter || this.singleSingle)
                $.each(this.parameter, function(index, parameter){
                    chartOptions.series.push({
                        name         : parameter.decodeGetName(true, false, _this.z),
                        nameInTooltip: parameter.decodeGetName(false, true, _this.z),
                        yAxis        : seriesAxisIndex[index],
                        tooltip      : parameter.hcOptions_series_tooltip('', _this.z),
data: [1,2,3,2,1,2,3],
                    });
                });
            else {
                $.each(this.locationName, function(index, location){
                    chartOptions.series.push({name: location});
                });
            }

            //Set style for the added series
            $.each(chartOptions.series, function(index, seriesOptions){
                chartOptions.series[index] = $.extend(true, seriesOptions, _this.series[index].seriesStyle);
            });

            //Add sub series
            var seriesLength = chartOptions.series.length;
            $.each(this.subSeries, function(subSeriesIndex, opt){
                var seriesOptions = $.extend(true, {}, chartOptions.series[opt.index]);
                seriesOptions.id = 'fcoo_series_' + chartOptions.series.length;

                chartOptions.series[opt.index].id = 'fcoo_series_'+opt.index;
                seriesOptions.linkedTo = chartOptions.series[seriesLength + subSeriesIndex - 1].id;

                seriesOptions = $.extend(true, seriesOptions, opt.seriesStyle);
                chartOptions.series.push(seriesOptions);
            });

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
            $.each(this.series, function(index, singleTimeSeries){
                singleTimeSeries.series = chart.series[index];
                chart.promiseList.append( singleTimeSeries.promiseListOptions() );
            });
            var thisSeriesLength = this.series.length;
            $.each(this.subSeries, function(index, singleTimeSeries){
                singleTimeSeries.series = chart.series[thisSeriesLength + index];
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