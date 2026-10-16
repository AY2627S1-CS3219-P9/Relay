#!/bin/sh
set -eu

: "${KAFKA_TOPIC_USER_EVENTS:?KAFKA_TOPIC_USER_EVENTS is required}"
: "${KAFKA_TOPIC_ERRAND_EVENTS:?KAFKA_TOPIC_ERRAND_EVENTS is required}"
: "${KAFKA_TOPIC_ERRAND_DLQ:?KAFKA_TOPIC_ERRAND_DLQ is required}"

for topic in \
  "$KAFKA_TOPIC_USER_EVENTS" \
  "$KAFKA_TOPIC_ERRAND_EVENTS" \
  "$KAFKA_TOPIC_ERRAND_DLQ"; do
  /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server kafka:9092 \
    --create --if-not-exists \
    --topic "$topic" \
    --partitions 1 \
    --replication-factor 1
done
