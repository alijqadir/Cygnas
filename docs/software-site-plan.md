# Cygnas software-only site plan

## Architecture decision

A second Hugo site now lives under `sites/software/` instead of trying to force the existing `hugo.toml` and shared `content/` tree to behave like two different websites.

That keeps the main Cygnas site intact while giving the software property its own:

- base URL
- homepage
- navigation and footer variant
- deploy workflow
- software-only content scope

The software site reuses the existing Hugo patterns where sensible:

- Hugo content files and section routing
- the shared `embedhtml` shortcode pattern for embedded ZWSOFT pages
- shared root layouts/partials, with a `site_variant = "software"` switch for header/footer/body styling
- existing `static/zwsoft-uk/**` assets mounted into the software site

## File layout

### New software site root
- `sites/software/hugo.toml`
- `sites/software/README.md`
- `sites/software/content/_index.md`
- `sites/software/content/blog/_index.md`
- `sites/software/content/blog/zwcad-2027-is-it-time-uk-professionals-finally-ditched-the-autocad-treadmill.html`
- `sites/software/content/blog/zwcad-2027-review-faster-smarter-and-extremely-impressive-at-the-things-that-enhance-productivity.md`
- `sites/software/content/zwsoft-uk/_index.md`
- `sites/software/content/zwsoft-uk/zwcad.md`
- `sites/software/content/zwsoft-uk/zw3d.md`
- `sites/software/content/zwsoft-uk/zwcad-2027/_index.md`
- `sites/software/content/zwsoft-uk/zwcad-2027/bim-cad-workflows.md`
- `sites/software/content/zwsoft-uk/zwcad-2027/compare.md`
- `sites/software/content/zwsoft-uk/zwcad-2027/download.md`
- `sites/software/content/zwsoft-uk/zwcad-2027/migration.md`
- `sites/software/content/zwsoft-uk/zwcad-2027/whats-new.md`
- `sites/software/layouts/shortcodes/embedhtml.html`

### Shared-site changes used by both sites
- `layouts/_default/baseof.html`
- `layouts/partials/head.html`
- `layouts/partials/header.html`
- `layouts/partials/footer.html`
- `assets/css/main.css`

### Deployment
- `.github/workflows/deploy-software.yml`

## Content scope

The software site intentionally includes only software-relevant material:

- software homepage / landing page
- ZWSOFT hub
- ZWCAD embedded page
- ZW3D embedded page
- ZWCAD 2027 hub and subpages
- software-focused blog posts already present in the repo

It excludes unrelated Cygnas business lines such as the main engineering services homepage and Asystom.

## Build and test

### Main site
```bash
hugo --gc --minify --config hugo.toml --destination public -b https://www.cygnas.co.uk
```

### Software site
```bash
hugo --gc --minify --source sites/software --destination ../../public-software -b https://software.cygnas.co.uk
```

## Deployment notes

The existing main-site workflow remains unchanged:

- `.github/workflows/deploy.yml`
- deploys `public/`
- uses `LIGHTSAIL_HOST`, `LIGHTSAIL_USER`, `LIGHTSAIL_SSH_KEY`

The new workflow mirrors that approach for the software site:

- `.github/workflows/deploy-software.yml`
- manual `workflow_dispatch`
- builds from `sites/software`
- deploys `public-software/`
- reuses `LIGHTSAIL_HOST`, `LIGHTSAIL_USER`, `LIGHTSAIL_SSH_KEY`
- expects one additional secret: `SOFTWARE_REMOTE_PATH`

## Manual follow-up required

1. Create the target vhost / document root for `software.cygnas.co.uk` on the remote server.
2. Add the GitHub secret `SOFTWARE_REMOTE_PATH` with that server path, for example `/var/www/software.cygnas.co.uk/` if that is how the server is structured.
3. Confirm DNS and TLS for the software subdomain.
4. Run the new `Build and Deploy Software Site` workflow once the remote path is ready.
5. If you want automatic software deployments later, add push-path filters carefully so the main and software workflows do not step on each other.
