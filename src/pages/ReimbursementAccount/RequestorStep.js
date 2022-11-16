import React from 'react';
import lodashGet from 'lodash/get';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import moment from 'moment';
import PropTypes from 'prop-types';
import styles from '../../styles/styles';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import CONST from '../../CONST';
import TextLink from '../../components/TextLink';
import Navigation from '../../libs/Navigation/Navigation';
import CheckboxWithLabel from '../../components/CheckboxWithLabel';
import Text from '../../components/Text';
import * as BankAccounts from '../../libs/actions/BankAccounts';
import IdentityForm from './IdentityForm';
import * as ValidationUtils from '../../libs/ValidationUtils';
import compose from '../../libs/compose';
import ONYXKEYS from '../../ONYXKEYS';
import * as ReimbursementAccountUtils from '../../libs/ReimbursementAccountUtils';
import reimbursementAccountPropTypes from './reimbursementAccountPropTypes';
import * as Link from '../../libs/actions/Link';
import RequestorOnfidoStep from './RequestorOnfidoStep';
import Form from '../../components/Form';

const propTypes = {
    /** The bank account currently in setup */

    reimbursementAccount: reimbursementAccountPropTypes.isRequired,

    /** The token required to initialize the Onfido SDK */
    onfidoToken: PropTypes.string,

    ...withLocalizePropTypes,
};

const defaultProps = {
    onfidoToken: '',
};

class RequestorStep extends React.Component {
    constructor(props) {
        super(props);

        this.validate = this.validate.bind(this);
        this.submit = this.submit.bind(this);
        this.setOnfidoAsComplete = this.setOnfidoAsComplete.bind(this);

        this.state = {
            isOnfidoSetupComplete: lodashGet(props, ['achData', 'isOnfidoSetupComplete'], false),
        };
    }

    /**
     * Update state to indicate that the user has completed the Onfido verification process
     */
    setOnfidoAsComplete() {
        this.setState({isOnfidoSetupComplete: true});
    }

    /**
     * @param {Object} values
     * @returns {Object}
     */
    validate(values) {
        const errors = {};

        if (!values.firstName) {
            errors.firstName = this.props.translate('bankAccount.error.firstName');
        }

        if (!values.lastName) {
            errors.lastName = this.props.translate('bankAccount.error.lastName');
        }

        if (!values.dob || !ValidationUtils.isValidDate(values.dob)) {
            errors.dob = this.props.translate('bankAccount.error.dob');
        }

        if (values.dob && !ValidationUtils.meetsAgeRequirements(values.dob)) {
            errors.dob = this.props.translate('bankAccount.error.age');
        }

        if (!values.ssnLast4 || !ValidationUtils.isValidSSNLastFour(values.ssnLast4)) {
            errors.ssnLast4 = this.props.translate('bankAccount.error.ssnLast4');
        }

        if (!values.requestorAddressStreet) {
            errors.requestorAddressStreet = this.props.translate('bankAccount.error.address');
        }

        if (values.requestorAddressStreet && !ValidationUtils.isValidAddress(values.requestorAddressStreet)) {
            errors.requestorAddressStreet = this.props.translate('bankAccount.error.addressStreet');
        }

        if (!values.requestorAddressCity) {
            errors.requestorAddressCity = this.props.translate('bankAccount.error.addressCity');
        }

        if (!values.requestorAddressState) {
            errors.requestorAddressState = this.props.translate('bankAccount.error.addressState');
        }

        if (!values.requestorAddressZipCode || !ValidationUtils.isValidZipCode(values.requestorAddressZipCode)) {
            errors.requestorAddressZipCode = this.props.translate('bankAccount.error.zipCode');
        }

        if (!values.isControllingOfficer) {
            errors.isControllingOfficer = this.props.translate('requestorStep.isControllingOfficerError');
        }

        return errors;
    }

    submit(values) {
        const payload = {
            bankAccountID: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'bankAccountID', 0),
            ...values,
            dob: moment(values.dob).format(CONST.DATE.MOMENT_FORMAT_STRING),
        };

        BankAccounts.updatePersonalInformationForBankAccount(payload);
    }

    render() {
        const achData = this.props.reimbursementAccount.achData;
        const shouldShowOnfido = achData.useOnfido && this.props.onfidoToken && !this.state.isOnfidoSetupComplete;

        return (
            <>
                <HeaderWithCloseButton
                    title={this.props.translate('requestorStep.headerTitle')}
                    stepCounter={{step: 3, total: 5}}
                    shouldShowGetAssistanceButton
                    guidesCallTaskID={CONST.GUIDES_CALL_TASK_IDS.WORKSPACE_BANK_ACCOUNT}
                    shouldShowBackButton
                    onBackButtonPress={() => {
                        if (shouldShowOnfido) {
                            BankAccounts.clearOnfidoToken();
                        } else {
                            BankAccounts.goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.COMPANY);
                        }
                    }}
                    onCloseButtonPress={Navigation.dismissModal}
                />
                {shouldShowOnfido ? (
                    <RequestorOnfidoStep onComplete={this.setOnfidoAsComplete} />
                ) : (
                    <Form
                        formID={ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM}
                        submitButtonText={this.props.translate('common.saveAndContinue')}
                        validate={this.validate}
                        onSubmit={this.submit}
                        style={[styles.mh5, styles.flexGrow1]}
                    >
                        <Text>{this.props.translate('requestorStep.subtitle')}</Text>
                        <View style={[styles.mb5, styles.mt1, styles.dFlex, styles.flexRow]}>
                            <TextLink
                                style={[styles.textMicro]}
                                // eslint-disable-next-line max-len
                                href="https://community.expensify.com/discussion/6983/faq-why-do-i-need-to-provide-personal-documentation-when-setting-up-updating-my-bank-account"
                            >
                                {`${this.props.translate('requestorStep.learnMore')}`}
                            </TextLink>
                            <Text style={[styles.textMicroSupporting]}>{' | '}</Text>
                            <TextLink
                                style={[styles.textMicro, styles.textLink]}
                                // eslint-disable-next-line max-len
                                href="https://community.expensify.com/discussion/5677/deep-dive-security-how-expensify-protects-your-information"
                            >
                                {`${this.props.translate('requestorStep.isMyDataSafe')}`}
                            </TextLink>
                        </View>
                        <IdentityForm
                            translate={this.props.translate}
                            defaultValues={{
                                firstName: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'firstName'),
                                lastName: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'lastName'),
                                street: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'requestorAddressStreet'),
                                city: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'requestorAddressCity'),
                                state: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'requestorAddressState'),
                                zipCode: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'requestorAddressZipCode'),
                                dob: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'dob'),
                                ssnLast4: ReimbursementAccountUtils.getDefaultStateForField(this.props, 'ssnLast4'),
                            }}
                            inputKeys={{
                                firstName: 'firstName',
                                lastName: 'lastName',
                                dob: 'dob',
                                ssnLast4: 'ssnLast4',
                                street: 'requestorAddressStreet',
                                city: 'requestorAddressCity',
                                state: 'requestorAddressState',
                                zipCode: 'requestorAddressZipCode',
                            }}
                            shouldSaveDraft
                        />
                        <CheckboxWithLabel
                            inputID="isControllingOfficer"
                            defaultValue={ReimbursementAccountUtils.getDefaultStateForField(this.props, 'isControllingOfficer', false)}
                            LabelComponent={() => (
                                <View style={[styles.flex1, styles.pr1]}>
                                    <Text>{this.props.translate('requestorStep.isControllingOfficer')}</Text>
                                </View>
                            )}
                            style={[styles.mt4]}
                            shouldSaveDraft
                        />
                        <Text style={[styles.mt3, styles.textMicroSupporting]}>
                            {this.props.translate('requestorStep.onFidoConditions')}
                            <Text
                                onPress={() => Link.openExternalLink('https://onfido.com/facial-scan-policy-and-release/')}
                                style={[styles.textMicro, styles.link]}
                                accessibilityRole="link"
                            >
                                {`${this.props.translate('onfidoStep.facialScan')}`}
                            </Text>
                            {', '}
                            <Text onPress={() => Link.openExternalLink('https://onfido.com/privacy/')} style={[styles.textMicro, styles.link]} accessibilityRole="link">
                                {`${this.props.translate('common.privacyPolicy')}`}
                            </Text>
                            {` ${this.props.translate('common.and')} `}
                            <Text onPress={() => Link.openExternalLink('https://onfido.com/terms-of-service/')} style={[styles.textMicro, styles.link]} accessibilityRole="link">
                                {`${this.props.translate('common.termsOfService')}`}
                            </Text>
                        </Text>
                    </Form>
                )}
            </>
        );
    }
}

RequestorStep.propTypes = propTypes;
RequestorStep.defaultProps = defaultProps;

export default compose(
    withLocalize,
    withOnyx({
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
        onfidoToken: {
            key: ONYXKEYS.ONFIDO_TOKEN,
        },
    }),
)(RequestorStep);
