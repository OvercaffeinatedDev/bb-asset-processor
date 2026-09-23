declare global {
  interface ltiSessionData {
    state: string;
    deploymentId: string;
    nonce: string;
    sub?: string;
    aud?: string;
    deepLinkingReturnURL?: string;
    deepLinkingData?: string;
    oneTimeSessionToken?: string;
    siteUrl?: string;
    jwtData?: string;
  }

  interface AuthToken {
    id: string;
    site: string;
    token: string;
    expirationDate: Date;
  }

  interface LTIAssertionData {
    iss: string;
    sub: string;
    aud: string[];
    iat: number;
    exp: number;
    jti: string;
  }

  type TokenType = string;
  export interface DeepLinkingRequest {
    sub: string;
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
    'https://purl.imsglobal.org/spec/lti/claim/version': string;
    'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': DeepLinkingLtiAgsEndpoint;
    iss: string;
    locale: string;
    'https://purl.imsglobal.org/spec/lti/claim/tool_platform': DeepLinkingToolPlatform;
    'https://purl.imsglobal.org/spec/lti/claim/custom': DeepLinkingCustomProperties;
    'https://purl.imsglobal.org/spec/lti/claim/lis': DeepLinkingLis;
    exp: number;
    iat: number;
    email: string;
    'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': DeepLinkingNamesAndRoles;
    given_name: string;
    'https://purl.imsglobal.org/spec/lti/claim/roles'?: string[] | null;
    nonce: string;
    'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
    'https://purl.imsglobal.org/spec/lti/claim/context': DeepLinkingContext;
    'https://purl.imsglobal.org/spec/lti/claim/resource_link': DeepLinkingResourceLink;
    'https://purl.imsglobal.org/spec/lti-gs/claim/groupsservice': DeepLinkingGroupsService;
    aud: string;
    'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
    name: string;
    'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': DeepLinkingSettings;
    family_name: string;
    'https://blackboard.com/lti/claim/one_time_session_token': string;
    'https://blackboard.com/webapps/foundations-connector/foundations-ids': DeepLinkingFoundations;
    'https://purl.imsglobal.org/spec/lti/claim/eulaservice': {
      scope: string[];
      url: string;
    };
    'https://purl.imsglobal.org/spec/lti-ap/claim/assetservice'?: {
      assets: AssetList[];
    };
    // LtiReportReviewRequest — identifies which asset/submission to load the
    // report for (see reportView.json).
    'https://purl.imsglobal.org/spec/lti/claim/asset'?: {
      id: string;
    };
    'https://purl.imsglobal.org/spec/lti-aip/claim/submission'?: {
      submission_id: string;
    };
  }

  export interface AssetList {
    asset_id: string;
    url: string;
    title: string;
    filename: string;
    checksum: string;
    checksum_algorithm: string;
    size: number;
    content_type: string;
  }

  // Server-to-server notice fired when a student submits an asset for analysis —
  // no browser/OIDC round trip precedes it, so there's no `state`/`nonce` to
  // validate against (see the LtiSubmissionNotice branch in launch/route.ts).
  export interface LtiSubmissionNoticeRequest {
    iss: string;
    aud: string;
    iat: number;
    exp: number;
    locale: string;
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
    'https://purl.imsglobal.org/spec/lti/claim/version': string;
    'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
    'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
    'https://purl.imsglobal.org/spec/lti/claim/tool_platform': DeepLinkingToolPlatform;
    'https://purl.imsglobal.org/spec/lti/claim/context': DeepLinkingContext;
    'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: string; title: string };
    'https://purl.imsglobal.org/spec/lti/claim/custom'?: { reports_released?: string };
    'https://purl.imsglobal.org/spec/lti/claim/for_user': {
      user_id: string;
      eula_accepted_at?: string;
    };
    'https://purl.imsglobal.org/spec/lti-aip/claim/activity': { activity_id: string };
    'https://purl.imsglobal.org/spec/lti-aip/claim/submission': { submission_id: string };
    'https://purl.imsglobal.org/spec/lti-ap/claim/assetreport': {
      report_url: string;
      scope: string[];
    };
    'https://purl.imsglobal.org/spec/lti-ap/claim/assetservice'?: {
      assets: AssetList[];
      scope?: string[];
    };
    'https://blackboard.com/webapps/foundations-connector/foundations-ids'?: DeepLinkingFoundations;
  }

  export interface DeepLinkingLtiAgsEndpoint {
    scope?: string[] | null;
    lineitems: string;
    lineitem: string;
  }
  export interface DeepLinkingToolPlatform {
    contact_email: string;
    description: string;
    guid: string;
    name: string;
    url: string;
    product_family_code: string;
    version: string;
  }
  export interface DeepLinkingCustomProperties {
    caliper_profile_url?: string;
    caliper_federated_session_id?: string;
    // Platform-defined custom parameters vary per placement — e.g. `reports_released`,
    // `anonymous_grading`, and the `reportManager: "true"` flag the reports list route
    // checks for (see reportView.json / the LtiResourceLinkRequest branch in launch/route.ts).
    [key: string]: string | undefined;
  }
  export interface DeepLinkingLis {
    person_sourcedid: string;
    course_section_sourcedid: string;
  }
  export interface DeepLinkingNamesAndRoles {
    context_memberships_url: string;
    service_versions?: string[] | null;
    scope?: string[] | null;
  }
  export interface DeepLinkingContext {
    id: string;
    title: string;
    label: string;
    type?: string[] | null;
  }
  export interface DeepLinkingResourceLink {
    id: string;
    title?: string;
    description?: string;
  }
  export interface DeepLinkingGroupsService {
    context_groups_url: string;
    context_group_sets_url: string;
    service_versions?: string[] | null;
    scope?: string[] | null;
  }
  export interface DeepLinkingSettings {
    accept_media_types: string;
    accept_presentation_document_targets?: string[] | null;
    accept_types?: string[] | null;
    accept_multiple: boolean;
    auto_create: boolean;
    accept_copy_advice: boolean;
    deep_link_return_url: string;
    data: string;
  }
  export interface DeepLinkingFoundations {
    'tenant-id': string;
    'user-id': string;
    'course-id': string;
    'site-id': string;
    region: string;
  }
}

export {};
