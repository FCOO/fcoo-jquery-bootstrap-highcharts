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
                    //pointWidth: undefined,   //A pixel value specifying a fixed width for each column or bar point. When set to undefined, the width is calculated from the pointPadding and groupPadding. The width effects the dimension that is not based on the point value. For column series it is the hoizontal length and for bar series it is the vertical length.
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
            approximation   : "average",//"average", //"average", "averages", "open", "high", "low", "close", "sum" or function([]NUMBER) return NUMBER
            groupPixelWidth: 10, //The approximate pixel width of each group. If for example a series with 30 points is displayed over a 600 pixel wide plot area, no grouping is performed. If however the series contains so many points that the spacing is less than the groupPixelWidth, Highcharts will try to group it into appropriate groups so that each is more or less two pixels wide. Defaults to 10.

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