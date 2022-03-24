const $ = require('jquery');
const { toBik_text } = require('bikram-sambat');
const moment = require('moment');

const medicXpathExtensions = require('@medic-xpath-extensions');
const {
  ContactServices,
  FileServices,
  FormDataServices,
  TranslationServices,
  XmlServices,
  EnketoFormManager
} = require('@medic/enketo-form-manager');

class FormWireup {
  constructor() {
  }

  async render(formHtml, formModel, instanceData) {
    const userContact = { _id: 'user1' };

    // BREAK
    const dbService = {
      get: () => ({
        getAttachment: (formId, attachment) => {
          if (attachment === 'form.html') {
            return Promise.resolve(formHtml);
          }
          if (attachment === 'model.xml') {
            return Promise.resolve(formModel);
          }

          // it is probably an image
          return Promise.resolve({});
          // return Promise.resolve('data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==');
        },
        bulkDocs: () => Promise.resolve([]),
      }),
    };
    const extractLineageService = {
      extract: contact => {
        return {
          _id: contact._id,
          parent: {
            _id: 'minified_parent',
          },
        };
      },
    };
    const userContactService = {
      get: () => Promise.resolve(userContact),
    };
    const fileReaderService = {
      utf8: x => x,
    };
    const contactSummaryService = {
      get: (contact, reports, lineage) => {
        // recycle reduce reuse
        return {
          fields: [],
          cards: [],
          context: { foo: 'bar' },
        };
      },
    };
    const userSettingsService = {
      get: () => Promise.resolve({
        _id: 'user-settings-doc',
      }),
    };
    const languageService = {
      get: () => 'en',
    };
    const lineageModelGeneratorService = {
      contact: () => Promise.resolve({
        lineage: ['lineage_parent_1', 'lineage_parent_2'],
      }),
    };
    const searchService = {
      search: (type, filters, options, extensions, docIds) => {
        // TODO
        return [];
      },
    };
    const translateService = {
      instant: x => x,
    };
    const translateFromService = {
      get: x => x,
    };
    const addAttachmentService = {
      add: () => {},
    };
    const getReportContentService = {};
    const xmlFormsService = {
      get: () => Promise.resolve({}),
      findXFormAttachmentName: () => 'model.xml',
    };
    const transitionsService = {
      // this is some muting business
      applyTransitions: x => x,
    };
    const GlobalActions = {};

    this.enketoFormMgr = new EnketoFormManager(
      new ContactServices(extractLineageService, userContactService),
      new FileServices(dbService, fileReaderService),
      new FormDataServices(
        contactSummaryService,
        userSettingsService,
        languageService,
        lineageModelGeneratorService,
        searchService
      ),
      new TranslationServices(translateService, translateFromService),
      new XmlServices(
        addAttachmentService,
        getReportContentService,
        xmlFormsService
      ),
      transitionsService,
      GlobalActions
    );

    const zscoreUtil = {};
    medicXpathExtensions.init(zscoreUtil, toBik_text, moment);

    // BREAK
    const selector = '#enketo-wrapper';
    const formDoc = { _id: 'whatever', title: 'form name ABC 987' };
    await this.enketoFormMgr.render(selector, formDoc, instanceData);
    return this.enketoFormMgr;
  }

  renderContactForm(formContext) {
    return this.enketoFormMgr.renderForm(formContext)
      .then(form => registerListeners(
        formContext.selector,
        form,
        formContext.editedListener,
        formContext.valuechangeListener
      ));
  }

  save(formInternalId, form, geoHandle, docId) {
    // /inputs is ALWAYS relevant #4875
    $('section[name$="/inputs"]').each((idx, element) => {
      if(element.dataset) {
        element.dataset.relevant = 'true()';
      }
    });

    return Promise
      .resolve(form.validate())
      .then((valid) => {
        if (!valid) {
          throw new Error('Form is invalid');
        }

        $('form.or').trigger('beforesave');

        return this.enketoFormMgr.save(formInternalId, form, geoHandle, docId);
      });
  }

  unload(form) {
    this.enketoFormMgr.unload(form);
  }
}

const registerListeners = (selector, form, editedListener, valueChangeListener) => {
  // const $selector = $(selector);
  // if(editedListener) {
  //   $selector.on('edited', () => this.ngZone.run(() => editedListener()));
  // }
  
  // [
  //   valueChangeListener,
  //   () => this.enketoFormMgr.setupNavButtons(form, $selector, form.pages._getCurrentIndex())
  // ].forEach(listener => {
  //   if(listener) {
  //     $selector.on('xforms-value-changed', () => this.ngZone.run(() => listener()));
  //   }
  // });

  return form;
};

/* Enketo Translation Service */
const bindJsonToXml = function(elem, data={}, childMatcher) {
  Object.keys(data).map(key => [key, data[key]])
    .forEach(function(pair) {
      const current = findCurrentElement(elem, pair[0], childMatcher);
      const value = pair[1];

      if (value !== null && typeof value === 'object') {
        if(current.children().length) {
          bindJsonToXml(current, value);
        } else {
          current.text(value._id);
        }
      } else {
        current.text(value);
      }
    });
};

const findCurrentElement = function(elem, name, childMatcher) {
  if (childMatcher) {
    return elem.find(childMatcher(name));
  } 
  
  return elem.children(name);
};

module.exports = FormWireup;
