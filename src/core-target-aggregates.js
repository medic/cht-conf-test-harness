const { DateTime } = require('luxon');
const { getMonthStartDate } = require('./dateUtils');

const MAX_TARGET_MONTHS = 3;

const ReportingPeriod = {
  PREVIOUS: 'previous',
};

class TargetAggregatesService {
  constructor(chtCore, pouchDb, settingsDoc) {
    this.chtCore = chtCore;
    this.pouchDb = pouchDb;
    this.settingsDoc = settingsDoc;
  }

  _getIntervalTag(targetInterval) {
    // return moment(targetInterval.end).format(this.INTERVAL_TAG_FORMAT);
    return DateTime.fromMillis(targetInterval.end).toFormat('yyyy-MM');
  }

  _getCurrentInterval(appSettings) {
    const uhcMonthStartDate = getMonthStartDate(appSettings);
    const targetInterval = this.chtCore.CalendarInterval.getCurrent(uhcMonthStartDate);

    return {
      uhcMonthStartDate,
      targetInterval
    };
  }

  /**
   * Targets reporting intervals cover a calendaristic month, starting on a configurable day (uhcMonthStartDate)
   * Each target doc will use the end date of its reporting interval, in YYYY-MM format, as part of its _id
   * ex: uhcMonthStartDate is 12, current date is 2020-02-03, the <interval_tag> will be 2020-02
   * ex: uhcMonthStartDate is 15, current date is 2020-02-21, the <interval_tag> will be 2020-03
   *
   * @param appSettings - The application settings containing uhcMonthStartDate
   * @param reportingPeriod - Optional. ReportingPeriod enum value (CURRENT or PREVIOUS)
   * @param monthsAgo - Optional. Number of reporting periods ago.
   * @returns A string representing the interval tag in YYYY-MM format
   */

  _getTargetIntervalTag(appSettings, reportingPeriod, monthsAgo = 1) {
    const { uhcMonthStartDate, targetInterval: currentInterval } = this._getCurrentInterval(appSettings);
    if (!reportingPeriod || reportingPeriod === ReportingPeriod.CURRENT) {
      return this._getIntervalTag(currentInterval);
    }

    const oldDate = DateTime.fromMillis(currentInterval.end).minus({ months: monthsAgo });
    const targetInterval = this.chtCore.CalendarInterval.getInterval(uhcMonthStartDate, oldDate.valueOf());
    return this._getIntervalTag(targetInterval);
  }

  /**
   * Every target doc follows the _id scheme `target~<interval_tag>~<contact_uuid>~<user_id>`
   * In order to retrieve the latest target document(s), we compute the current interval <interval_tag>
   */
  async _fetchLatestTargetDocs(appSettings, reportingPeriod) {
    const tag = this._getTargetIntervalTag(appSettings, reportingPeriod);

    const opts = {
      start_key: `target~${tag}~`,
      end_key: `target~${tag}~\ufff0`,
      include_docs: true,
    };

    const results = await this.pouchDb.allDocs(opts);
    return results.rows.map(row => row.doc).filter(doc => doc);
  }

  async _fetchTargetDocsForInterval(contactUuid, intervalTag) {
    const opts = {
      start_key: `target~${intervalTag}~${contactUuid}~`,
      end_key: `target~${intervalTag}~${contactUuid}~\ufff0`,
      include_docs: true
    };

    const results = await this.pouchDb.allDocs(opts);
    return results.rows.map(row => row.doc);
  }

  async _fetchTargetDocs(appSettings, contactUuid) {
    const allTargetDocs = [];
    for (let monthsOld = 0; monthsOld < MAX_TARGET_MONTHS; monthsOld++) {
      const intervalTag = this._getTargetIntervalTag(appSettings, ReportingPeriod.PREVIOUS, monthsOld);
      const intervalTargetDocs = await this._fetchTargetDocsForInterval(contactUuid, intervalTag);
      allTargetDocs.push(...intervalTargetDocs);
    }
    return allTargetDocs;
  }

  _getTargetsConfig(settings, aggregatesOnly = false) {
    return settings?.tasks?.targets?.items?.filter(target => aggregatesOnly ? target.aggregate : true) || [];
  }

  _getTargetDetails(targetDoc, settings) {
    if (!targetDoc) {
      return;
    }

    const targetsConfig = this._getTargetsConfig(settings);
    targetDoc.targets.forEach(targetValue => {
      const targetConfig = targetsConfig.find(item => item.id === targetValue.id);
      Object.assign(targetValue, targetConfig);
    });

    return targetDoc;
  }

  async getTargetDocs(
    contact,
    userFacilityIds,
    userContactId
  ) {
    const contactUuid = contact?._id;
    if (!contactUuid) {
      return [];
    }

    const isUserFacility = userFacilityIds?.includes(contactUuid);
    const shouldLoadTargetDocs = isUserFacility || await this.chtCore.ContactTypesUtils.isPerson(contact);
    if (!shouldLoadTargetDocs) {
      return [];
    }

    const targetContact = isUserFacility ? userContactId : contactUuid;
    const settings = this.settingsDoc;
    const targetDocs = await this._fetchTargetDocs(settings, targetContact);
    return targetDocs.map(targetDoc => this._getTargetDetails(targetDoc, settings));
  }
}

module.exports = TargetAggregatesService;
