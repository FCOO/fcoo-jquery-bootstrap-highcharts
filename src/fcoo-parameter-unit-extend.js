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
        _decodeGetName: function(inclUnit, useSpeedParameter, z, useShortName){
            var param = this;
            if (useSpeedParameter && (this.speed_direction.length > 0))
                param = this.speed_direction[0];
            return decode( param.getName(inclUnit, z, null/*useUnit*/, useShortName) );
        },

        decodeGetName       : function(inclUnit, useSpeedParameter, z){ return this._decodeGetName(inclUnit, useSpeedParameter, z      ); },
        decodeGetShortName  : function(inclUnit, useSpeedParameter, z){ return this._decodeGetName(inclUnit, useSpeedParameter, z, true); },


        //hcOptions_XX: Return options for given part of options for charts
        hcOptions_axis_title: function(z){
            return {
                text: this.decodeGetName(true, false, z)
            };
        },

        //tooltip for single series
        hcOptions_series_tooltip: function(valuePrefix = '', z){
            return {
                valueDecimals: this.decimals,
                valuePrefix  : valuePrefix,
                valueSuffix  : this.unit.decodeGetName(true, z)
            };
        },

        //Set decimals on axis labels equal as parameter, but decimals = 0 if no labels has decimals
        hcOptions_axis_labels_formatter: function(){
            var valueFormat = this.decimals ? '0,0.' + '0'.repeat(this.decimals) : '0,0';
            return function(){
                let noDecimals = true;
                this.axis.tickPositions.forEach( labelValue => {
                    noDecimals = noDecimals && (labelValue % 1 === 0);
                });

                return window.numeral( this.value ).format( noDecimals ? '0,0' : valueFormat );
            };
        },

        hcOptions_axis_labels: function(){
            return {
                formatter: this.hcOptions_axis_labels_formatter()
            };
        }

    });


}(jQuery, this.Highcharts, this, document));