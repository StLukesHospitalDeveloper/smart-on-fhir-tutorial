(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) {
          var byCodes = smart.byCodes(obv, 'code');
          var identifier = patient.identifier;
          var active = patient.active;
          var name = patient.name;
          var gender = patient.gender;
          var telecom = patient.telecom;
          
          
          var dob = new Date(patient.birthDate);
          var day = dob.getDate();
          var monthIndex = dob.getMonth() + 1;
          var year = dob.getFullYear();

          var dobStr = monthIndex + '/' + day + '/' + year;
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.identifier = identifier;
          p.identifier_use = identifier.use;
          p.identifier_type = identifier.type;
          p.identifier_system = identifier.system;
          p.identifier_value = identifier.value;
          p.identifier_period = identifier.period;
          p.identifier_assigner = identifier.assigner;
          //p.identifier2 = identifier;
          p.active = active;
          p.name = name;
          p.name_use = name.use;
          p.name_text = name.text;
          p.name_family = name.family;
          p.name_given = name.given;
          p.name_suffix = name.suffix;
          p.name_period = name.period;
          p.telecom = telecom;
          
          
          p.birthdate = dobStr;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.age = parseInt(calculateAge(dob));
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      identifier: {value: ''},
      identifier_use: {value: ''},
      identifier_type: {value: ''},
      identifier_system: {value: ''},
      identifier_value: {value: ''},
      identifier_period: {value: ''},
      identifier_assigner: {value: ''},
      //identifier2: {use: '', type: {''}, system: '', value: '', period: {''}, assigner: {''}},
      active: {value: ''},
      name: {value: ''},
      name_use: {value: ''},
      name_text: {value: ''},
      name_family: {value: ''},
      name_given: {value: ''},
      name_suffix: {value: ''},
      name_period: {value: ''},
      telecom: {value: ''},
      
      
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      age: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function isLeapYear(year) {
    return new Date(year, 1, 29).getMonth() === 1;
  }

  function calculateAge(date) {
    if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
      var d = new Date(date), now = new Date();
      var years = now.getFullYear() - d.getFullYear();
      d.setFullYear(d.getFullYear() + years);
      if (d > now) {
        years--;
        d.setFullYear(d.getFullYear() - 1);
      }
      var days = (now.getTime() - d.getTime()) / (3600 * 24 * 1000);
      return years + days / (isLeapYear(now.getFullYear()) ? 366 : 365);
    }
    else {
      return undefined;
    }
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#identifier_use').html(p.identifier.use);
    $('#identifier_type').html(p.identifier.type);
    $('#identifier_system').html(p.identifier.system);
    $('#identifier_value').html(p.identifier.value);
    $('#identifier_period').html(p.identifier.period);
    $('#identifier_assigner').html(p.identifier.assigner);
    $('#identifier_use2').html(p.identifier_use);
    $('#identifier_type2').html(p.identifier_type);
    $('#identifier_system2').html(p.identifier_system);
    $('#identifier_value2').html(p.identifier_value);
    $('#identifier_period2').html(p.identifier_period);
    $('#identifier_assigner2').html(p.identifier_assigner);
    /*
    $('#identifier_use3').html(p.identifier2.use);
    $('#identifier_type3').html(p.identifier2.type);
    $('#identifier_system3').html(p.identifier2.system);
    $('#identifier_value3').html(p.identifier2.value);
    $('#identifier_period3').html(p.identifier2.period);
    $('#identifier_assigner3').html(p.identifier2.assigner);
    */
    $('#active').html(p.active);
    $('#name_use').html(p.name.use);
    $('#name_text').html(p.name.text);
    $('#name_family').html(p.name.family);
    $('#name_given').html(p.name.given);
    $('#name_prefix').html(p.name.prefix);
    $('#name_suffix').html(p.name.suffix);
    $('#name_period').html(p.name.period);
    $('#name_use2').html(p.name_use);
    $('#name_text2').html(p.name_text);
    $('#name_family2').html(p.name_family);
    $('#name_given2').html(p.name_given);
    $('#name_prefix2').html(p.name_prefix);
    $('#name_suffix2').html(p.name_suffix);
    $('#name_period2').html(p.name_period);
    $('#telecom').html(p.telecom);
    
    
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#age').html(p.age);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
  };

})(window);
