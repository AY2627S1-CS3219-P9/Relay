import type { RequestHandler } from 'express'
export const requireSameOrigin: RequestHandler = (req,res,next) => {
  const origin=req.header('origin')
  if(!origin) { next(); return } // Non-browser clients do not set Origin.
  const host=req.header('x-forwarded-host') ?? req.header('host')
  const protocol=req.header('x-forwarded-proto') ?? req.protocol
  if(host && origin===`${protocol}://${host}`) { next(); return }
  res.status(403).json({ok:false,error:{code:'FORBIDDEN',message:'Cross-origin requests are not allowed.'}})
}
