# AUGUR Creative Tech Challenge

## Goal

Create “proof-of-concept” recognition software that passes as many of the following tests as possible. The more tests passed in your submission, the higher your score will be. If you have previously built software for this, then feel free to use that software as a foundation to pass the tests.

## Challenge

1. [✓] When a visitor hits a page, assign a unique ID to that browser
2. [✓] After the browser is restarted, when the visitor hits the page again the browser has the same ID
3. [✓] After the browser clears cookies, the browser is still assigned the same ID
4. [✓] After the browser clears cache, cookies, and all, the browser is still assigned the same ID
5. [✓] Some, or all, of the browsers (chrome, firefox, opera, IE, Safari, etc.) on the device share the same ID
6. [✓] If you got this to work on desktop, get this to also work on mobile
7. [✓] Create a scalable solution

# SUMMARY

Technically my solution fulfills all of the requirements; however there are definitely weaknesses and caveats associated with the node server I've written, that would be a non-issue if client-side logic was used as well as server-side.

I've created a `tokenModel` that provides helpers for fetching/writing documents to RethinkDB. I've also created a middleware that every request is routed through to check against the `tokenModel`.

The current flow goes something like:

* Generate fingerprint based off of the user-agent as well as the IP (this is the weakest part of the process)
* See if a token can be fetched with either the fingerprint or a cookie if it exists
  * If no token is fetched
    * Create a new token
    * Return it to the user
  * Otherwise, if a token is fetched by the cookie, but the fingerprint doesn't match
    * Update the token's fingerprint to match the current fingerprint (this happens when the IP changes)
    * Return the token to the user
  * Otherwise, if a token is fetched by the fingerprint, but the cookie doesn't match
    * Update the token's cookie
    * Return the token to the user
  * If there are no problems
    * Return the fetched token to the user

The goal of this is to make the stored token somewhat resilient. In order to circumvent the middleware, the user would have to destroy the cookie after their IP has changed without visiting the site in between.

The weaknesses are as follows:

* Because I'm only relying on the UA string to generate the fingerprint (and only the device parts), if more than one user under the same IP has a UA that is identical, the two machines will be marked as the same machine. The primary way to get around this would be to generate a more distinct fingerprint using front end information (screen resolution, canvas fingerprint, etc).
* The cookie is currently only somewhat resilient, it could be made more-so through the use of front-end storage mechanisms that aren't easily destroyed (Flash, local storage, webDB, etc).
