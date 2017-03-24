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

```
Usage: unifi-adoption-bot --host hostname --adoptionfolder /etc/unifi-adoption-bot

Options:
  --logfile, -f         Path to unifi server's log file (default to "/var/log/unifi/server.log")
  --user, -u            Unifi's username *required* (default to env.UNIFI_USER)
  --pass                Unifi's password *required* (default to env.UNIFI_PASS)
  --host, -h            Unifi's hostname *required*
  --port, -p            Unifi's port     *required* (default to 8443)
  --adoptionfolder, -d  Folder containing lists of AP *required*
  --verbosity, -v       Log level (choices: "error", "warn", "info", "verbose", "debug") (default to "info")
```
