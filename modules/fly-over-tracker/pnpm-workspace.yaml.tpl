packages:
  - backend
  - frontend

allowBuilds:
  '@parcel/watcher': false
  better-sqlite3: true
  esbuild: true

minimumReleaseAgeExclude:
  - '@{{NPM_SCOPE}}/homesweethome-config'
  - '@{{NPM_SCOPE}}/homesweethome'