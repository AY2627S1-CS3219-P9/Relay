import express, { type ErrorRequestHandler } from 'express'
import { createAuthRouter } from './routes/auth.routes.js'
import { AuthError } from './types/auth.types.js'
export const app = express()
app.use(express.json({limit:'1mb'}))
app.get(['/health','/healthz'],(_req,res)=>res.status(200).json({status:'ok'}))
app.use('/api/auth',createAuthRouter())
const errorHandler:ErrorRequestHandler=(error,_req,res,_next)=>{
  if(error instanceof AuthError) { res.status(error.status).json({ok:false,error:{code:error.code,message:error.message,...(error.fieldErrors?{fieldErrors:error.fieldErrors}:{})}});return }
  if(error instanceof SyntaxError) { res.status(400).json({ok:false,error:{code:'VALIDATION_FAILED',message:'The request body contains invalid JSON.'}});return }
  console.error(error)
  res.status(500).json({ok:false,error:{code:'INTERNAL_ERROR',message:'An unexpected error occurred.'}})
}
app.use(errorHandler)
