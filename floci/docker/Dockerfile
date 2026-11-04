FROM floci/floci:latest-compat
COPY --chmod=755 floci/common/init.sh /etc/floci/init/ready.d/01-init.sh
COPY infra/relay-auth.yaml infra/relay-storage.yaml infra/relay-floci-db.yaml /opt/relay/infra/
