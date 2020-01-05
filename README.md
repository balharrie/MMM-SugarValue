# MMM-SugarValue
Unofficial Magic Mirror module for displaying Dexcom G6 sugar readings via the share API.

**NOTE: This does not replace your Dexcom applications or reader, and is only meant for a quick glance indication. You should not rely on it for any medication decisions etc.**

## Installing the module

Clone this git repository into your Magic Mirror modules directory using:

    git clone https://github.com/balharrie/MMM-SugarValue.git

The repository includes a pre-built version.

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:

    modules: [
      {
          module: "MMM-SugarValue",
          position: "top_left",
          config: {
              username: "", // Set to your share username
              password: ""  // Password for your share account
          }
      }
    ]

## Configuration

The following properties can be configured:

| Option | Description |
| ------ | ----------- |
| `server` | Which server to use. / **Possible values:** `us` or `eu`. Defaults to `us` |
| `username` | Username for your Dexcom share account. |
| `password` | Password for your Dexcom share account. |
| `units` | What units to display the sugar value in. / **Possible values:** `mmol` or `mg`. Defaults to `mmol`. European users will probably want to use `mg` |

## Building the module

If you want to build the module yourself use:

    npm install
    npm run build
