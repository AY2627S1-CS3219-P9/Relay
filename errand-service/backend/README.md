# Errand Service backend

Errand state changes and their Kafka events are written to errand_event_outbox
in the same PostgreSQL transaction. The errand repository builds the distinct payload for
each lifecycle event. The pending-errand worker runs every five seconds and
records ErrandCreationFailed for stale pending rows; it does not publish Kafka
messages. The outbox publisher runs every second, sends unpublished events to
the configured errand topic, and marks each row published only after Kafka
acknowledges it. A failed send leaves the row pending for retry. The publisher
removes published rows older than seven days during its minute-by-minute cleanup.
Unpublished rows are never deleted by this cleanup.
