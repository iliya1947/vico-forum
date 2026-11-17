import { useRef } from "react";
import { useHeaderAuthUser } from "../auth/auth-controls";

/** Same viewer-bound presentation rule as canonical ProfileView; no auth store. */
export function useOwnerSnapshot(snapshot:object,viewerId:string|undefined):boolean {
  const user=useHeaderAuthUser();
  const current=useRef({snapshot,viewerId,matched:false,invalidated:false});
  if(current.current.snapshot!==snapshot||current.current.viewerId!==viewerId)
    current.current={snapshot,viewerId,matched:false,invalidated:false};
  // Optional only for legacy standalone presentation consumers. New request
  // loaders always supply their exact admitted viewer identity.
  if(viewerId===undefined)return true;
  const matches=user?.id===viewerId;
  if(current.current.matched&&!matches)current.current.invalidated=true;
  if(matches&&!current.current.invalidated)current.current.matched=true;
  return matches&&!current.current.invalidated;
}
