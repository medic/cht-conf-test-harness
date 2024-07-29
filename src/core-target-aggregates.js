const { DateTime } = require('luxon');
const { getMonthStartDate } = require('./dateUtils');

const NBR_MONTHS = 3;

class CoreTargetAggregates {
  constructor(chtCore, pouchDb, settingsDoc) {
    this.chtCore = chtCore;
    this.pouchDb = pouchDb;
    this.settingsDoc = settingsDoc;
  }

  _getIntervalTag(targetInterval) {
    // return moment(targetInterval.end).format('Y-MM'); // 2024-06
    return DateTime.fromMillis(targetInterval.end).toFormat('yyyy-MM');
  }

  _getCurrentInterval(settings) {
    const uhcMonthStartDate = getMonthStartDate(settings);
    const targetInterval = this.chtCore.CalendarInterval.getCurrent(uhcMonthStartDate);

    return {
      uhcMonthStartDate,
      targetInterval
    };
  }

  _getOldIntervalTag(currentInterval, uhcMonthStartDate, monthsOld) {
    // const oldDate = moment(currentInterval.end).subtract(monthsOld, 'months');
    const oldDate = DateTime.fromMillis(currentInterval.end).minus({ months: monthsOld });
    const targetInterval = this.chtCore.CalendarInterval.getInterval(uhcMonthStartDate, oldDate.toMillis());
    return this._getIntervalTag(targetInterval);
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

  async _fetchTargetDocs(settings, contactUuid) {
    const allTargetDocs = [];
    const { targetInterval, uhcMonthStartDate } = this._getCurrentInterval(settings);
    for (let monthsOld = 0; monthsOld < NBR_MONTHS; monthsOld++) {
      const intervalTag = this._getOldIntervalTag(targetInterval, uhcMonthStartDate, monthsOld);
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

  async getTargetDocs(contact, userFacilityId, userContactId) {
    const contactUuid = contact?._id;
    if (!contactUuid) {
      return [];
    }

    const isUserFacility = contactUuid === userFacilityId;
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

module.exports = CoreTargetAggregates;
