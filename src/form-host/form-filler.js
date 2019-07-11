const _ = require('underscore');
const $ = require('jquery');

class FormFiller {
  constructor(formName, form, options) {
    this.form = form;
    this.formName = formName,
    this.options = _.defaults(options, {
      verbose: true,
    });
    this.log = (...args) => this.options.verbose && console.log('FormFiller', ...args);
  }

  /**
   * An object describing the result of filling a form.
   * @typedef {Object} FillResult
   * @property {FillError[]} errors A list of errors 
   * @property {string} section The page number on which the errors occurred
   * @property {Object} report The report object which resulted from submitting the filled report. Undefined if an error blocks form submission.
   */

  /**
   * An object describing an error which has occurred while filling a form.
   * @typedef {Object} FillError 
   * @property {string} type A classification of the error [ 'validation', 'general', 'page' ]
   * @property {string} msg Description of the error 
   */
  async fill(multiPageAnswer) {
    this.log(`Filling in ${multiPageAnswer.length} pages.`);
    const results = [];
    for (let pageIndex in multiPageAnswer) {
      const pageAnswer = multiPageAnswer[pageIndex];
      const result = await fillPage(this, pageAnswer);
      results.push(result);

      if (result.errors.length > 0) {
        return {
          errors: result.errors,
          section: `page-${pageIndex}`,
          answers: pageAnswer,
        };
      }
    }

    this.form.validateAll();
    const errors = await this.getVisibleValidationErrors();
    const isComplete = this.form.pages.getCurrentIndex() === this.form.pages.$activePages.length - 1;
    const incompleteError = isComplete ? [] : [{ type: 'general', msg: 'Form is incomplete' }];
    return {
      errors: [...incompleteError, ...errors],
      section: 'general',
      report: isComplete ? getRecordForCompletedForm(this.form, this.formName, window.now) : undefined,
    };
  }

  // Modified from enketo-core/src/js/Form.js validateContent
  getVisibleValidationErrors() {
    const self = this;
    const $container = self.form.view.$;
    const validations = $container.find('.question').addBack('.question').map(() => {
      const $elem = $(this).find('input:not(.ignore):not(:disabled), select:not(.ignore):not(:disabled), textarea:not(.ignore):not(:disabled)');
      if ($elem.length === 0) {
        return Promise.resolve();
      }
      return self.form.validateInput( $elem.eq( 0 ) );
    }).toArray();

    return Promise.all( validations ).then(() => {
        const validationErrors = $container
          .find('.invalid-required:not(.disabled), .invalid-constraint:not(.disabled), .invalid-relevant:not(.disabled)')
          .children('span.active:not(.question-label)')
          .filter(function() {
            return $(this).css('display') == 'block';
          });

        return Array.from(validationErrors)
          .map(span => ({
            type: 'validation',
            question: span.parentElement.innerText,
            msg: span.innerText,
          }));
      })
      .catch(err => [{
        type: 'failure to validate',
        msg: err,
      }]);
  }
};

const fillPage = async (self, pageAnswer) => {
  self.log(`Answering ${pageAnswer.length} questions.`);

  for (let i = 0; i < pageAnswer.length; i++) {
    const answer = pageAnswer[i];
    const $questions = getVisibleQuestions(self);
    if ($questions.length <= i) {
      return {
        errors: [{
          type: 'page',
          answers: pageAnswer,
          section: `page-${i}`,
          msg: `Attempted to fill ${pageAnswer.length} questions, but only ${$questions.length} are visible.`,
        }],
      };
    }

    fillQuestion($questions[i], answer);
  }
  
  const success = await form.pages.next();
  const validationErrors = await self.getVisibleValidationErrors();
  const advanceFailure = success || validationErrors.length ? [] : [{
    type: 'general',
    msg: 'Failed to advance to next page',
  }];
  
  return {
    errors: [...advanceFailure, ...validationErrors],
  };
}

const fillQuestion = (question, answer) => {
  if (!answer) return;
  
  const $question = $(question);
  const firstInput = Array.from($question.find('input'))[0];
  
  if (!firstInput) {
    throw 'No input field found within question';
  }

  switch (firstInput.type) {
    case 'radio':
      $question.find(`input[value="${answer}"]`).click();
      break;
    case 'date':
    case 'text':
    case 'number':
      $question.find('input').val(answer).trigger('change');
      break;
    case 'checkbox':
      // for a collection of three checkboxes, pass in "true,false,true"
      answer.split(',').forEach((val, index) => $question.find(`input:nth(${index})`).prop('checked', val).trigger('change'));
      break;
    default:
      throw `Unhandled input type ${firstInput.type}`;
  }
};

const getVisibleQuestions = form => {
  const currentPage = form.form.pages.getCurrent();
  if (currentPage.hasClass('question')) {
    return currentPage;
  }

  return currentPage.children(':not(h4):not(.disabled,.note)');
};

const getRecordForCompletedForm = (form, formName, now) => {
  const record = form.getDataStr({ irrelevant: false });
  return {
    form: formName,
    type: 'data_record',
    content_type: 'xml',
    reported_date: now ? now.getTime() : Date.now(),
    // contact: ExtractLineage(contact),
    // from: contact && contact.phone,
    fields: reportRecordToJs(record, form),
  };
};

/* Enketo-Translation reportRecordToJs */
const reportRecordToJs = function(record, formXml) {
  var root = $.parseXML(record).firstChild;
  if (!formXml) {
    return nodesToJs(root.childNodes);
  }
  var repeatPaths = $(formXml)
    .find('repeat[nodeset]')
    .map(function() {
      return $(this).attr('nodeset');
    })
    .get();
  return nodesToJs(root.childNodes, repeatPaths, '/' + root.nodeName);
};

const nodesToJs = function(data, repeatPaths, path) {
  repeatPaths = repeatPaths || [];
  path = path || '';
  var result = {};
  withElements(data)
    .each(function(n) {
      var dbDocAttribute = n.attributes.getNamedItem('db-doc');
      if (dbDocAttribute && dbDocAttribute.value === 'true') {
        return;
      }

      var typeAttribute = n.attributes.getNamedItem('type');
      var updatedPath = path + '/' + n.nodeName;
      var value;

      var hasChildren = withElements(n.childNodes).size().value();
      if(hasChildren) {
        value = nodesToJs(n.childNodes, repeatPaths, updatedPath);
      } else if (typeAttribute && typeAttribute.value === 'binary') {
        // this is attached to the doc instead of inlined
        value = '';
      } else {
        value = n.textContent;
      }

      if (repeatPaths.indexOf(updatedPath) !== -1) {
        if (!result[n.nodeName]) {
          result[n.nodeName] = [];
        }
        result[n.nodeName].push(value);
      } else {
        result[n.nodeName] = value;
      }
    });
  return result;
};

function withElements(nodes) {
  return _.chain(nodes)
    .filter(function(n) {
      return n.nodeType === Node.ELEMENT_NODE;
    });
}

module.exports = FormFiller;
