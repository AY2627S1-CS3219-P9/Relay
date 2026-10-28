import type { RequestHandler } from 'express'
import { readAccessToken } from '@relay/user-auth-jwt-verify'
import { verifyLocal } from '../services/token.service.js'
export const requireAuth: RequestHandler = async (req,res,next) => {
  const token=readAccessToken(req.header('cookie'))
  if(!token) { res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED',message:'Authentication is required.'}}); return }
  try { req.user=await verifyLocal(token); next() }
  catch { res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED',message:'The access token is invalid or expired.'}}) }
}
export const requireSuperAdmin: RequestHandler = (req,res,next) => {
  if(req.user?.role !== 'super-admin') { res.status(403).json({ok:false,error:{code:'FORBIDDEN',message:'Super admin access required.'}}); return }
  next()
}
