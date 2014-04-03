/**
 * Text Box
 * Support word wrap and word break
 * Drawing is based on the Text
 * @export{class} TextBox
 *
 * TODO: support word wrap of non-english text
 *      shift first line by (lineHeight-fontSize)/2
 */
define(function(require) {

    var Node = require('../Node');
    var Vector2 = require("qtek/math/Vector2");
    var Text = require('./Text');
    var util = require('qtek/core/util')

    var TextBox = Node.derive(function() {
        return {
            start           : new Vector2(),
            width           : 0,
            wordWrap        : false,
            wordBreak       : false,
            lineHeight      : 0,
            stroke          : false,
            // private prop, save Text instances
            _texts          : []
        }
    }, function() {
        // to verify if the text is changed
        this._oldText = "";
    }, {
        computeBoundingBox : function() {
            // TODO
        },
        draw : function(ctx) {
            if (this.text != this._oldText) {
                this._oldText = this.text;

                //set font for measureText
                if (this.font) {
                    ctx.font = this.font;
                }
                if (this.wordBreak) {
                    this._texts = this.computeWordBreak(ctx);
                }
                else if (this.wordWrap) {
                    this._texts = this.computeWordWrap(ctx);
                }
                else{
                    var txt = new Text({
                        text : this.text
                    })
                    this.extendCommonProperties(txt);
                    this._texts = [txt]
                }
            }

            ctx.save();
            ctx.textBaseline = 'top';
            for (var i = 0; i < this._texts.length; i++) {
                var _text = this._texts[i];
                _text.draw(ctx);
            }
            ctx.restore();
        },
        computeWordWrap : function(ctx) {
            if (! this.text) {
                return;
            }
            var words = this.text.split(' ');
            var len = words.length;
            var lineWidth = 0;
            var wordWidth;
            var wordText;
            var texts = [];
            var txt;

            var wordHeight = ctx.measureText("m").width;

            for(var i = 0; i < len; i++) {
                wordText = i == len-1 ? words[i] : words[i]+' ';
                wordWidth = ctx.measureText(wordText).width;
                if (lineWidth + wordWidth > this.width ||
                    ! txt) {    //first line
                    // create a new text line and put current word
                    // in the head of new line
                    txt = new Text({
                        text : wordText, //append last word
                        start : this.start.clone().add(new Vector2(0, this.lineHeight*(texts.length+1) - wordHeight))
                    })
                    this.extendCommonProperties(txt);
                    texts.push(txt);

                    lineWidth = wordWidth;
                }else{
                    lineWidth += wordWidth;
                    txt.text += wordText;
                }
            }
            return texts;
        },
        computeWordBreak : function(ctx) {
            if (! this.text) {
                return;
            }
            var len = this.text.length;
            var letterWidth;
            var letter;
            var lineWidth = ctx.measureText(this.text[0]).width;
            var texts = [];
            var txt;

            var wordHeight = ctx.measureText("m").width;

            for (var i = 0; i < len; i++) {
                letter = this.text[i];
                letterWidth = ctx.measureText(letter).width;
                if (lineWidth + letterWidth > this.width || 
                    ! txt) {    //first line
                    var txt = new Text({
                        text : letter,
                        start : this.start.clone().add(new Vector2(0, this.lineHeight*(texts.length+1) - wordHeight))
                    });
                    this.extendCommonProperties(txt);
                    texts.push(txt);
                    // clear prev line states
                    lineWidth = letterWidth;
                } else {
                    lineWidth += letterWidth;
                    txt.text += letter;
                }
            }
            return texts;
        },
        extendCommonProperties : function(txt) {
            var props = {};
            util.extend(txt, {
                fill : this.fill,
                stroke : this.stroke
            })
        },
        intersect : function(x, y) {
        }
    })

    return TextBox;
})