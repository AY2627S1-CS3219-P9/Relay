import { Kafka } from 'kafkajs'
import { ErrandEventPublisher } from './errand-event-publisher.js'
import { ErrandRepository } from '../backend/src/repositories/errand.repository.js'
import { generateAuthTokenFromCredentialsProvider } from 'aws-msk-iam-sasl-signer-js'
import { fromHttp } from '@aws-sdk/credential-provider-http'
const auth = process.env.KAFKA_AUTH_MODE === 'iam'
  ? { ssl: true, sasl: { mechanism: 'oauthbearer' as const, oauthBearerProvider: async () => ({ value: (await generateAuthTokenFromCredentialsProvider({ region: process.env.AWS_REGION ?? 'us-east-1', awsCredentialsProvider: fromHttp() })).token }) } }
  : process.env.KAFKA_AUTH_MODE === 'plain'
    ? { sasl: { mechanism: 'plain' as const, username: process.env.KAFKA_USERNAME ?? '', password: process.env.KAFKA_PASSWORD ?? '' } }
    : {}
const kafka = new Kafka({ clientId: 'errand-event-publisher', brokers: (process.env.KAFKA_BROKERS ?? 'kafka:9092').split(','), retry: { retries: 3 }, ...auth })
const publisher = new ErrandEventPublisher(kafka, new ErrandRepository(), process.env.KAFKA_TOPIC_ERRAND_EVENTS ?? 'errand-events')
async function start() { while (true) { try { await publisher.start(); return } catch (error) { console.error(error); await new Promise(resolve => setTimeout(resolve, 5000)) } } }
void start()
async function stop() { await publisher.stop(); process.exit(0) }
process.once('SIGTERM', () => void stop())
process.once('SIGINT', () => void stop())
