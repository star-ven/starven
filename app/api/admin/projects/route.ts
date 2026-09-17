import { listAllProjects,createProject } from '@/db/projects';
import { requireAdminRequest,requireSameOrigin,adminJson,adminPayload,operationError } from '@/lib/admin-auth';
import { trustedCover } from '@/lib/admin-covers';
import { validateProject } from '@/lib/contracts.mjs';
import type { ProjectCreateInput } from '@/db/projects';
export const dynamic='force-dynamic';
export async function GET() {
  const denied=await requireAdminRequest(); if(denied) return denied;
  try { return adminJson({projects:await listAllProjects()}); }
  catch(error) { console.error('Admin projects unavailable',error); return adminJson({error:'作品服务暂时不可用，请稍后重试。'},503); }
}
export async function POST(request:Request) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const origin= requireSameOrigin(request); if(origin) return origin;
  try {
    const input=await adminPayload(request);
    const validated=validateProject({...input,...await trustedCover(input?.coverKey),status:'draft'});
    if(!validated.ok) return adminJson({error:'请检查作品内容。',fieldErrors:validated.fieldErrors},422);
    return adminJson({project:await createProject(validated.value as ProjectCreateInput)},201);
  } catch(error) { return operationError(error); }
}
