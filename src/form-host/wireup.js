const $ = require('jquery');

const {
  ContactServices,
  FileServices,
  FormDataServices,
  TranslationServices,
  XmlServices,
  EnketoFormManager
} = require('@medic/enketo-form-manager');

const HARDCODED_TYPES = [
  'district_hospital',
  'health_center',
  'clinic',
  'person'
];

class FormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary) {
    // BREAK
    const dbService = {
      get: () => ({
        // for sibling doc scenario with contact forms?
        get: () => Promise.resolve({}), 
        getAttachment: (formId, attachment) => {
          if (attachment === 'form.html') {
            return Promise.resolve(formHtml);
          }
          if (attachment === 'model.xml') {
            return Promise.resolve(formModel);
          }
          if (attachment === 'form.xml') {
            return Promise.resolve(formXml);
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
          // parent: {
          //   _id: 'minified_parent',
          // },
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
      get: () => contactSummary,
      
    };
    const languageService = {
      get: () => Promise.resolve('en'),
    };
    window.CHTCore.Language = languageService;

    const lineageModelGeneratorService = {
      contact: () => Promise.resolve({
        lineage: ['lineage_parent_1', 'lineage_parent_2'],
      }),
    };
    const searchService = {
      search: () => [],
    };
    const translateService = {
      get: x => Promise.resolve(x),
      instant: x => x,
    };
    window.CHTCore.Translate = translateService;

    const translateFromService = {
      get: x => x,
    };
    const addAttachmentService = {
      add: () => {},
    };
    const getReportContentService = {};
    const xmlFormsService = {
      get: () => Promise.resolve({}),
      findXFormAttachmentName: () => 'form.xml',
    };
    const transitionsService = {
      // this is some muting business
      applyTransitions: x => Promise.resolve(x),
    };
    const contactTypesService = {
      isHardcodedType: type => HARDCODED_TYPES.includes(type),
    };
    const GlobalActions = {};

    window.CHTCore.AndroidAppLauncher = { isEnabled: () => false };
    window.CHTCore.MRDT = { enabled: () => false };
    window.CHTCore.Select2Search = { init: () => Promise.resolve() };
    window.CHTCore.Settings = {
      get: () => Promise.resolve({
        default_country_code: '1'
      })
    };

    this.enketoFormMgr = new EnketoFormManager(
      new ContactServices(
        extractLineageService,
        userContactService,
        contactTypesService,
      ),
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
    const selector = '#enketo-wrapper';
    const formDoc = { _id: 'whatever', title: 'form name ABC 987' };
    return await this.enketoFormMgr.render(selector, formDoc, content);
  }

  renderContactForm(instanceData) {
    const selector = '#enketo-wrapper';
    const formContext = {
      selector,
      formDoc: { _id: 'whatever', title: 'form name ABC 987' },
      instanceData,
    };
    return this.enketoFormMgr.renderContactForm(formContext);
  }

  async save(formInternalId, form, geoHandle, docId) {
    await this.enketoFormMgr.validate(form);
    $('form.or').trigger('beforesave');
    return this.enketoFormMgr.save(formInternalId, form, geoHandle, docId);
  }

  async saveContactForm(type, form, unused2, docId) {
    try {
      await this.enketoFormMgr.validate(form);
      return {
        errors: [],
        preparedDocs: (await this.enketoFormMgr.saveContactForm(form, docId, type)).preparedDocs,
      };
    }
    catch (e) {
      return { 
        errors: [
          {
            type: 'save',
            msg: `Failed to save contact form: ${e}`,
          },
          ...await window.formFiller.getVisibleValidationErrors(),
        ],
        preparedDocs: [],
      };
    }
  }

  unload(form) {
    this.enketoFormMgr.unload(form);
  }
}

module.exports = FormWireup;
