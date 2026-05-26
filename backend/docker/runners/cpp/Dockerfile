FROM gcc:13

WORKDIR /workspace

# Security: no network access allowed in container (enforced by host config)
RUN useradd -m -u 1001 runner

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r//' /entrypoint.sh && chmod +x /entrypoint.sh

RUN chown -R runner:runner /workspace
USER runner

ENTRYPOINT ["/entrypoint.sh"]
