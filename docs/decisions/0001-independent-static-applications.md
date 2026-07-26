# Independent static applications

Status: Accepted

## Context

Servitium hosts small tools with different interaction and layout needs. A
shared client router or backend state layer would couple their delivery and add
runtime complexity.

## Decision

Each application has its own HTML entrypoint, React source directory, Vite
configuration, styles, and tests. The Node server integrates them through
explicit subpath routes and serves their build output.

## Rationale

Independent entrypoints keep dependencies, failure modes, and review scope
small while reusing the repository's existing toolchain and visual language.

## Consequences

Common shell markup may remain duplicated until a concrete shared component
reduces more complexity than it introduces. Adding an application requires
build, container, server-route, home-page, and route-test integration.
