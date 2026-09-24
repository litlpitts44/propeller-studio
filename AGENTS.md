# Repository guidance

GitHub is the canonical source for Propeller Studio. Use short-lived branches and pull requests, and keep `main` deployable. Do not force-push or rewrite published history.

The `.lovable/` directory is retained as optional project metadata. The application must build and run without Lovable packages, gateways, or browser hooks. If the repository is connected to Lovable later, preserve this platform-independent baseline and keep provider credentials in server-side environment variables.
