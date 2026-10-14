#!/bin/sh
set -eu

: "${KAFKA_TOPIC_USER_REGISTERED:?KAFKA_TOPIC_USER_REGISTERED is required}"
: "${KAFKA_TOPIC_USER_DELETED:?KAFKA_TOPIC_USER_DELETED is required}"
: "${KAFKA_TOPIC_ERRAND_CONFIRMED:?KAFKA_TOPIC_ERRAND_CONFIRMED is required}"
: "${KAFKA_TOPIC_ERRAND_CANCELLED:?KAFKA_TOPIC_ERRAND_CANCELLED is required}"
: "${KAFKA_TOPIC_ERRAND_EXPIRED:?KAFKA_TOPIC_ERRAND_EXPIRED is required}"

for topic in \
  "$KAFKA_TOPIC_USER_REGISTERED" \
  "$KAFKA_TOPIC_USER_DELETED" \
  "$KAFKA_TOPIC_ERRAND_CONFIRMED" \
  "$KAFKA_TOPIC_ERRAND_CANCELLED" \
  "$KAFKA_TOPIC_ERRAND_EXPIRED"; do
  /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server kafka:9092 \
    --create --if-not-exists \
    --topic "$topic" \
    --partitions 1 \
    --replication-factor 1
done
