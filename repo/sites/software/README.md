# Cygnas Software Site

This repo now contains a second, standalone Hugo site for software-focused pages.

## Build commands

Main Cygnas site:

```bash
hugo --gc --minify --config hugo.toml --destination public -b https://www.cygnas.co.uk
```

Software-only site:

```bash
hugo --gc --minify --source sites/software --destination ../../public-software -b https://software.cygnas.co.uk
```

## Structure

- `hugo.toml` remains the main Cygnas website config.
- `sites/software/` contains the standalone software website.
- `sites/software/hugo.toml` is the software-site config.
- `sites/software/content/` contains only software-site content.
- `sites/software/content/zwsoft-uk/` reuses the existing ZWSOFT/ZWCAD embedded HTML patterns.
- `sites/software/content/blog/` links to the existing ZWCAD software articles.
- `static/zwsoft-uk/` is the only static asset tree mounted into the software site.

## Deployment

The current `.github/workflows/deploy.yml` is unchanged and continues to deploy the main site from `public/`.

The new `.github/workflows/deploy-software.yml` is manual-only. It builds `public-software/` and deploys it to the path stored in `SOFTWARE_REMOTE_PATH`, using the existing Lightsail host/user/key secrets.
