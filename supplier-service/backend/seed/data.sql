-- Seed data for suppliers table
-- Generated from data/csv/supplier-seed-data.csv

INSERT INTO suppliers (name, location, is_operational, operating_hours, service_types)
VALUES
  ('Anna''s x Soup Union', '{"lat":1.296444,"lng":103.773032,"buildingName":"Central Library","floorNumber":1}', true, '{"openingTime":"09:00","closingTime":"18:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('NUS Co-op', '{"lat":1.2967866,"lng":103.7732677,"buildingName":"Central Library","floorNumber":1}', true, '{"openingTime":"09:00","closingTime":"16:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[2]),
  ('Printer @ Com 2', '{"lat":1.2938347,"lng":103.7744572,"buildingName":"Com 2","floorNumber":1}', true, '{"openingTime":"00:00","closingTime":"23:59","daysOfWeek":[0,1,2,3,4,5,6]}', ARRAY[3]),
  ('Cool Spot', '{"lat":1.2940156,"lng":103.7738478,"buildingName":"Com2","floorNumber":1}', true, '{"openingTime":"09:00","closingTime":"21:30","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('InstaChef', '{"lat":1.2938898,"lng":103.7736305,"buildingName":"Terrace","floorNumber":1}', true, '{"openingTime":"00:00","closingTime":"23:59","daysOfWeek":[0,1,2,3,4,5,6]}', ARRAY[0]),
  ('Cafe+ Robot Cafe', '{"lat":1.296444,"lng":103.773032,"buildingName":"Central Library","floorNumber":1}', true, '{"openingTime":"00:00","closingTime":"23:59","daysOfWeek":[0,1,2,3,4,5,6]}', ARRAY[0,1]),
  ('A Hot Hideout', '{"lat":1.2908445,"lng":103.7770891,"buildingName":"Prince George''s Park","floorNumber":2}', true, '{"openingTime":"11:00","closingTime":"21:30","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('Arise and Shine', '{"lat":1.2991517,"lng":103.769064,"buildingName":"Engineering Block E4","floorNumber":4}', true, '{"openingTime":"08:00","closingTime":"18:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('Bakehaus / Aurea', '{"lat":1.2946778,"lng":103.7707872,"buildingName":"The Ridge","floorNumber":1}', true, '{"openingTime":"08:00","closingTime":"21:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('Central Square @ YIH', '{"lat":1.2984401,"lng":103.7726256,"buildingName":"Yusof Ishak House","floorNumber":1}', true, '{"openingTime":"08:00","closingTime":"20:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('Pasta Express', '{"lat":1.2947819,"lng":103.7704435,"buildingName":"Frontier","floorNumber":1}', true, '{"openingTime":"09:30","closingTime":"19:30","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('TOMORO COFFEE', '{"lat":1.2931259,"lng":103.7719943,"buildingName":"Hon Sui Sen Memorial Library","floorNumber":2}', true, '{"openingTime":"08:15","closingTime":"18:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0,1]),
  ('Octobox', '{"lat":1.2904347,"lng":103.7787588,"buildingName":"Prince George''s Park","floorNumber":2}', true, '{"openingTime":"00:00","closingTime":"23:59","daysOfWeek":[0,1,2,3,4,5,6]}', ARRAY[2]),
  ('Smooy', '{"lat":1.2948308,"lng":103.7716305,"buildingName":"COM3","floorNumber":1}', true, '{"openingTime":"11:00","closingTime":"21:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('Goh Bros E-Print Pte Ltd', '{"lat":1.2984905,"lng":103.7720544,"buildingName":"Yusof Ishak House","floorNumber":5}', true, '{"openingTime":"09:00","closingTime":"18:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[3]),
  ('Cheers Unmanned Convenience Store', '{"lat":1.2994341,"lng":103.7526298,"buildingName":"Engineering Block E3","floorNumber":4}', true, '{"openingTime":"00:00","closingTime":"23:59","daysOfWeek":[0,1,2,3,4,5,6]}', ARRAY[2]),
  ('Nami', '{"lat":1.2942982,"lng":103.7708813,"buildingName":"innovation4.0","floorNumber":1}', true, '{"openingTime":"08:00","closingTime":"17:30","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('Supersnacks', '{"lat":1.2913847,"lng":103.7776367,"buildingName":"Prince George''s Park","floorNumber":1}', true, '{"openingTime":"11:00","closingTime":"02:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0]),
  ('Good Day Cafe', '{"lat":1.2967989,"lng":103.7794336,"buildingName":"Medicine+Science Library","floorNumber":1}', true, '{"openingTime":"07:30","closingTime":"18:30","daysOfWeek":[0,1,2,3,4]}', ARRAY[0,1]),
  ('The Coffee Roaster', '{"lat":1.296252229,"lng":103.7720926,"buildingName":"Blk AS8","floorNumber":1}', true, '{"openingTime":"08:00","closingTime":"17:30","daysOfWeek":[0,1,2,3,4]}', ARRAY[0,1]),
  ('he by He Brews', '{"lat":1.300566804,"lng":103.7707577,"buildingName":"Engineering Block EA","floorNumber":1}', true, '{"openingTime":"08:00","closingTime":"17:00","daysOfWeek":[0,1,2,3,4]}', ARRAY[0,1]);
