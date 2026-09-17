import { updateInquiryStatus,deleteInquiry,type InquiryStatus } from '@/db/inquiries';
import { requireAdminRequest,requireSameOrigin,adminJson,adminPayload,operationError } from '@/lib/admin-auth';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const origin=requireSameOrigin(request); if(origin) return origin;
  try {
    const input=await adminPayload(request);
    if(!['new','read','resolved'].includes(input?.status)) return adminJson({error:'无效的状态。'},422);
    const {id}=await context.params; const inquiry=await updateInquiryStatus(id,input.status as InquiryStatus);
    if(!inquiry) return adminJson({error:'留言不存在。'},404);
    const {sourceHash,submissionId,...publicInquiry}=inquiry;
    return adminJson({inquiry:publicInquiry});
  } catch(error) { return operationError(error); }
}
export async function DELETE(request:Request,context:Context) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const origin=requireSameOrigin(request); if(origin) return origin;
  try {
    if((await adminPayload(request))?.confirm!==true) return adminJson({error:'请确认删除。'},422);
    const {id}=await context.params;
    if(!await deleteInquiry(id)) return adminJson({error:'留言不存在。'},404);
    return new Response(null,{status:204,headers:{'Cache-Control':'private, no-store'}});
  } catch(error) { return operationError(error); }
}
