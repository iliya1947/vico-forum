/** Presentation-only mapping for classified Appeal command failures. */
export type AppealCommandError = "invalid"|"conflict"|"forbidden"|"notFound"|"unavailable";

export function appealFeedbackKey(error:AppealCommandError,command:"submit"|"resolve"){
 switch(error){
  case "invalid":return command==="submit"?"complaintAppealSubmitErrorInvalid":"complaintAppealResolveErrorInvalid";
  case "conflict":return command==="submit"?"complaintAppealSubmitErrorConflict":"complaintAppealResolveErrorConflict";
  case "forbidden":return "complaintAppealErrorForbidden";
  case "notFound":return "complaintAppealErrorNotFound";
  case "unavailable":return "complaintAppealErrorUnavailable";
 }
}
