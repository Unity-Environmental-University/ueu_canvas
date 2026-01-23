import {ILatePolicyData} from "../../canvasDataDefs";

export const latePolicyDummyData: ILatePolicyData = {
    id: 1,
    missing_submission_deduction: 20.0,
    late_submission_minimum_percent_enabled: true,
    missing_submission_deduction_enabled: true,
    late_submission_deduction: 1.0,
    late_submission_deduction_enabled: false,
    late_submission_interval: 'days',
    late_submission_minimum_percent: 0.0,
}

export default latePolicyDummyData