var _ = require('underscore'),
    ExtendedXpathEvaluator = require('extended-xpath'),
    openrosaExtensions = require('openrosa-xpath-extensions'),
    moment = require('moment'),
    { toBik_text } = require('bikram-sambat'),

    /* This file changed from v3.6 > v3.7, but not v3.7 > v3.11 */
    medicExtensions = require('cht-core-3-14/webapp/src/js/enketo/medic-xpath-extensions'),
    translator = require('cht-core-3-14/webapp/src/js/enketo/translator');

module.exports = function() {
    // re-implement XPathJS ourselves!
    var evaluator = new XPathEvaluator();
    this.xml.jsCreateExpression = function() {
        return evaluator.createExpression.apply( evaluator, arguments );
    };
    this.xml.jsCreateNSResolver = function() {
        return evaluator.createNSResolver.apply( evaluator, arguments );
    };
    this.xml.jsEvaluate = function(e, contextPath, namespaceResolver, resultType, result) {
        var extensions = openrosaExtensions(translator.t);

        // https://github.com/enketo/openrosa-xpath-evaluator/pull/28
        const _now = function() { return window.now || new Date(); };
        extensions._now = _now;
        medicExtensions.func.now =
          medicExtensions.func.today = function() { return { t: 'date', v: _now() }; };

        const zscoreUtil = {};
        medicExtensions.init(zscoreUtil, toBik_text, moment);
        extensions.func = _.extend(extensions.func, medicExtensions.func);
        var wrappedXpathEvaluator = function(v) {
            // Node requests (i.e. result types greater than 3 (BOOLEAN)
            // should be processed unaltered, as they are passed this
            // way from the ExtendedXpathEvaluator.  For anything else,
            // we will be ask for the most appropriate result type, and
            // handle as best we can.
            var wrappedResultType = resultType > XPathResult.BOOLEAN_TYPE ? resultType : XPathResult.ANY_TYPE;
            var doc = contextPath.ownerDocument;
            return doc.evaluate(v, contextPath, namespaceResolver, wrappedResultType, result);
        };
        var evaluator = new ExtendedXpathEvaluator(wrappedXpathEvaluator, extensions);
        return evaluator.evaluate(e, contextPath, namespaceResolver, resultType, result);
    };
    window.JsXPathException =
            window.JsXPathExpression =
            window.JsXPathNSResolver =
            window.JsXPathResult =
            window.JsXPathNamespace = true;
};
