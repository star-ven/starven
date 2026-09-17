import { listInquiries,type InquiryStatus } from '@/db/inquiries';
import { requireAdminRequest,adminJson } from '@/lib/admin-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const status=new URL(request.url).searchParams.get('status');
  if(status!==null&&!['new','read','resolved'].includes(status)) return adminJson({error:'无效的状态。'},422);
  try {
    const inquiries=await listInquiries((status??undefined) as InquiryStatus|undefined);
    return adminJson({inquiries:inquiries.map(({sourceHash,submissionId,...inquiry})=>inquiry)});
  } catch(error) { console.error('Admin inquiries unavailable',error); return adminJson({error:'留言服务暂时不可用，请稍后重试。'},503); }
}
