# Node FFL

A bot for affiliate banks of First Mutual Holding Co.  
See: [https://firstmutualholding.com/](https://firstmutualholding.com/).

Written for Node.js with TypeScript and designed to be Docker native.  
Created by reverse engineering the client-side API of affiliate banks.

MIT licensed. Free and open source software.  
Written by [Eric McDonald](https://juniperspring.xyz).

## Usage

Clone this repo and CD into its root directory.
Then build the Dockerfile:
`docker build -t node-ffl:latest .`
Create an environment variable file:
`vim production.env`

The Docker container is set up to output CSV files to the `/home/node/app/output` directory _within_ the container.
You can specify a volume (using the `-v` command) to map this directory to a directory on the host.

The `docker run` command below mounts this directory to an `ffl-output` directory within host user's home directory.
If you don't provide such a volume, the node process within the container will most likely fail to write any CSV output files as it won't have write access to the `/home/node/app/output` directory.

Run the image:
`docker run --env-file=production.env -v ~/ffl-output:/home/node/app/output -it --rm node-ffl:latest`

## Security

While I think this code is reasonably secure, don't take my word for it.
Node.js has some level of process isolation by nature of using the V8 runtime under the hood. But (as evidenced by the existence of [Deno](https://deno.land/)) Node.js isolation leaves much to be desired. At some point I might migrate this project to use Deno.

By using the official Node.js Docker image, I leverage isolation provided by Docker. I use a multistage `Dockerfile` to keep dev depenencies out of the final image. I also try to follow recommendations by the Node.js Docker image authors, such as using the non-privileged user `node`.

## Privacy

Running this code will probably make your user account stick out in your bank's server logs.
While I've taken steps to make the traffic generated by this code look like normal web traffic (e.g., allowing custom user agent strings, emulating cookie behavior), this does NOT replicate exactly how a web browser would normally interact with the bank's APIs.
Timing information, header order, and the lack of some requests (i.e., the lack of requests to unrelated parts of your bank's website) all evidence that you're using a bot.

There is one potential benefit for privacy. If this code runs at a set time every day, and you reference the output of this code, you may reveal less about the timing of your banking habits than if you were to interact with your bank's website directly.

## Dependencies (Non-Exhaustive)

I've done my best to keep dependencies as minimal as possible.
Dependencies should be popular and actively maintained.  
Any future maintainers would do well to maintain this ethos :)

- Uses [express](https://github.com/expressjs/express) for hosting a status server
- Uses [axios](https://github.com/axios/axios) for making HTTP requests
- Uses [convict](https://github.com/mozilla/node-convict) for configuration management
- Uses [cron](https://github.com/kelektiv/node-cron) for scheduling data retrieval
- Uses [csv-writer](https://github.com/adaltas/node-csv) for exporting account/txn data to CSV files
- Uses [qs](https://github.com/ljharb/qs) for parsing URL query strings
- Uses [tough-cookie](https://github.com/salesforce/tough-cookie) for HTTP cookie storage
- Uses [winston](https://github.com/winstonjs/winston) for logging
- Uses [zod](https://github.com/colinhacks/zod) for runtime checks of HTTP response data

## Legal Notice

- I am not affiliated with nor employed by First Mutual Holding Co. or Fiserv. Inc.
- I do not encourage abuse of their APIs
- I do not condone illegal activity
- Be respectful of API limits; don't hammer APIs that aren't yours
- This code is provided without warranty, see the license file
