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
  constructor(formHtml, formModel, userSettingsDoc) {
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

        // used by phone-widget to now allow multiple contacts with the same phone
        query: () => ({
          rows: [],
        }),
      }),
    };
    window.CHTCore.DB = dbService;
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
      get: () => Promise.resolve({
        _id: 'user_contact_service',
      }),
    };
    const userSettingsService = {
      get: () => Promise.resolve(userSettingsDoc),
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
  }

  async render(content) {
    const zscoreUtil = {};
    medicXpathExtensions.init(zscoreUtil, toBik_text, moment);

    const selector = '#enketo-wrapper';
    const formDoc = { _id: 'whatever', title: 'form name ABC 987' };
    return await this.enketoFormMgr.render(selector, formDoc, content);
  }

  renderContactForm(formContext) {
    return this.enketoFormMgr.renderForm(formContext);
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

module.exports = FormWireup;
