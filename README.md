# Unifi adoption bot
Monitor Unifi server's logs to automatically adopt AP

## Installation

`npm install unifi-adoption-bot -g`

## Usage

 - Create a folder with files named by their corresponding site ID
 - Add all the MAC addresses of the AP you want to adopt on that site
 - Optionaly, you can set the alias of the AP after the MAC address

In those files, empty lines and lines starting with `#` will be ignored. 

For example, a file named *b810ff5a* containing :

```
# replacement AP for the hall
F0:9F:C2:00:00:00 Hall - AP2

# batch of AP to be installed in the new building
80:2A:A8:00:00:01
80:2A:A8:00:00:02
80:2A:A8:00:00:03
80:2A:A8:00:00:04
80:2A:A8:00:00:05
80:2A:A8:00:00:06
```

Start the service with :

`unifi-adoption-bot --user <unifi's user> --pass <unifi's password> --host <http(s)://hostname:port> --logfile </path/to/server.log> --adoptionfolder </path/to/folder>`
