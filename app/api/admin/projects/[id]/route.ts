import { listAllProjects,updateProject,deleteProject,type ProjectUpdateInput } from '@/db/projects';
import { requireAdminRequest,requireSameOrigin,adminJson,adminPayload,operationError } from '@/lib/admin-auth';
import { trustedCover,cleanupCover } from '@/lib/admin-covers';
import { validateProject } from '@/lib/contracts.mjs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const origin=requireSameOrigin(request); if(origin) return origin;
  try {
    const {id}=await context.params;
    const previous=(await listAllProjects()).find(p=>p.id===id);
    if(!previous) return adminJson({error:'作品不存在。'},404);
    const input=await adminPayload(request);
    const validated=validateProject({...input,...await trustedCover(input?.coverKey)});
    if(!validated.ok) return adminJson({error:'请检查作品内容。',fieldErrors:validated.fieldErrors},422);
    const project=await updateProject(id,validated.value as ProjectUpdateInput);
    if(!project) return adminJson({error:'作品不存在。'},404);
    if(previous.coverKey!==project.coverKey) await cleanupCover(previous.coverKey);
    return adminJson({project});
  } catch(error) { return operationError(error); }
}
export async function DELETE(request:Request,context:Context) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const origin=requireSameOrigin(request); if(origin) return origin;
  try {
    if((await adminPayload(request))?.confirm!==true) return adminJson({error:'请确认删除。'},422);
    const {id}=await context.params; const deleted=await deleteProject(id);
    if(!deleted) return adminJson({error:'作品不存在。'},404);
    await cleanupCover(deleted.coverKey);
    return new Response(null,{status:204,headers:{'Cache-Control':'private, no-store'}});
  } catch(error) { return operationError(error); }
}
