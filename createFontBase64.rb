require 'json'

base64 = `base64 -w0 YuGothic-Regular-01.ttf`
b = {}
b[:gothic] = base64

File.open('gothic.json', "w") {|f| f.write b.to_json}
