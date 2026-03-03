import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";



actor {
  // Types
  type FeeCategory = {
    #OTP;
    #HalfYearly;
    #Term1;
    #Term2;
    #Term3;
    #Monthly;
  };

  type PaymentMode = {
    #Cash;
    #UPI;
    #BankTransfer;
  };

  type TransportOption = {
    #PickUpDrop;
    #OnlyPickUp;
    #OnlyDrop;
  };

  type AttendanceStatus = {
    #Present;
    #Absent;
  };

  type ReportCard = {
    studentId : Nat;
    subjects : [Text];
    columns : [Text];
    marksEntries : [[Float]];
  };

  type Payment = {
    id : Nat;
    studentId : Nat;
    amountPaid : Float;
    paymentDate : Time.Time;
    paymentMode : PaymentMode;
    feeCategory : FeeCategory;
  };

  type Student = {
    id : Nat;
    name : Text;
    studentClass : Text;
    section : Text;
    fatherName : Text;
    motherName : Text;
    contactNumber : Text;
    totalFee : Float;
    feePaymentCategory : FeeCategory;
    discountAmount : Float;
    finalFee : Float;
    examFeesSA1 : Float;
    examFeesSA2 : Float;
    reportCard : ?ReportCard;
    payments : [Payment];
  };

  type StudentExtras = {
    studentId : Nat;
    dateOfBirth : Text;
    aadharNo : Text;
    admissionNo : Text;
  };

  type TransportStudent = {
    id : Nat;
    name : Text;
    fatherName : Text;
    contactNumber : Text;
    transportOption : TransportOption;
    monthlyFee : Float;
    isActive : Bool;
    monthlyPayments : [TransportMonthlyPayment];
  };

  type TransportMonthlyPayment = {
    id : Nat;
    studentId : Nat;
    month : Nat;
    year : Nat;
    paid : Bool;
  };

  type AttendanceRecord = {
    id : Nat;
    date : Time.Time;
    studentId : Nat;
    studentName : Text;
    status : AttendanceStatus;
    studentClass : Text;
    section : Text;
  };

  // Comparison Modules
  module Student {
    public func compare(a : Student, b : Student) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module AttendanceRecord {
    public func compare(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module TransportStudent {
    public func compare(a : TransportStudent, b : TransportStudent) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module TransportMonthlyPayment {
    public func compare(a : TransportMonthlyPayment, b : TransportMonthlyPayment) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module StudentExtras {
    public func compare(a : StudentExtras, b : StudentExtras) : Order.Order {
      Nat.compare(a.studentId, b.studentId);
    };
  };

  // State
  stable var nextStudentId = 1;
  stable var nextAttendanceId = 1;
  stable var nextTransportId = 1;
  stable var nextPaymentId = 1;
  stable var nextTransportPaymentId = 1;

  stable let students = Map.empty<Nat, Student>();
  stable let transportStudents = Map.empty<Nat, TransportStudent>();
  stable let attendanceRecords = List.empty<AttendanceRecord>();
  stable let studentExtras = Map.empty<Nat, StudentExtras>();

  // Student Functions
  public shared ({ caller }) func addStudent(
    name : Text,
    studentClass : Text,
    section : Text,
    fatherName : Text,
    motherName : Text,
    contactNumber : Text,
    totalFee : Float,
    feePaymentCategory : FeeCategory,
    discountAmount : Float,
    finalFee : Float,
    examFeesSA1 : Float,
    examFeesSA2 : Float
  ) : async Nat {
    let student = {
      id = nextStudentId;
      name;
      studentClass;
      section;
      fatherName;
      motherName;
      contactNumber;
      totalFee;
      feePaymentCategory;
      discountAmount;
      finalFee;
      examFeesSA1;
      examFeesSA2;
      reportCard = null;
      payments = [];
    };
    students.add(nextStudentId, student);
    nextStudentId += 1;
    student.id;
  };

  public shared ({ caller }) func updateStudent(
    id : Nat,
    name : Text,
    studentClass : Text,
    section : Text,
    fatherName : Text,
    motherName : Text,
    contactNumber : Text,
    totalFee : Float,
    feePaymentCategory : FeeCategory,
    discountAmount : Float,
    finalFee : Float,
    examFeesSA1 : Float,
    examFeesSA2 : Float
  ) : async () {
    switch (students.get(id)) {
      case (null) { Runtime.trap("Student not found") };
      case (?existing) {
        let updatedStudent = {
          id;
          name;
          studentClass;
          section;
          fatherName;
          motherName;
          contactNumber;
          totalFee;
          feePaymentCategory;
          discountAmount;
          finalFee;
          examFeesSA1;
          examFeesSA2;
          reportCard = existing.reportCard;
          payments = existing.payments;
        };
        students.add(id, updatedStudent);
      };
    };
  };

  public shared ({ caller }) func deleteStudent(id : Nat) : async () {
    students.remove(id);
  };

  public query ({ caller }) func getStudentById(id : Nat) : async ?Student {
    students.get(id);
  };

  public query ({ caller }) func getAllStudents() : async [Student] {
    students.values().toArray().sort(func(a : Student, b : Student) : Order.Order { Nat.compare(a.id, b.id) });
  };

  // Attendance Functions
  public shared ({ caller }) func saveAttendance(
    date : Time.Time,
    classSection : Text,
    records : [(Nat, Text, AttendanceStatus)]
  ) : async () {
    for ((studentId, studentName, status) in records.values()) {
      let record = {
        id = nextAttendanceId;
        date;
        studentId;
        studentName;
        status;
        studentClass = classSection;
        section = classSection;
      };
      attendanceRecords.add(record);
      nextAttendanceId += 1;
    };
  };

  // Fee Payment Functions
  public shared ({ caller }) func addFeePayment(
    studentId : Nat,
    amountPaid : Float,
    paymentDate : Time.Time,
    paymentMode : PaymentMode,
    feeCategory : FeeCategory
  ) : async Nat {
    switch (students.get(studentId)) {
      case (null) { Runtime.trap("Student not found") };
      case (?student) {
        let payment = {
          id = nextPaymentId;
          studentId;
          amountPaid;
          paymentDate;
          paymentMode;
          feeCategory;
        };
        nextPaymentId += 1;

        let updatedPayments = student.payments.concat([payment]);
        let updatedStudent = {
          id = student.id;
          name = student.name;
          studentClass = student.studentClass;
          section = student.section;
          fatherName = student.fatherName;
          motherName = student.motherName;
          contactNumber = student.contactNumber;
          totalFee = student.totalFee;
          feePaymentCategory = student.feePaymentCategory;
          discountAmount = student.discountAmount;
          finalFee = student.finalFee;
          examFeesSA1 = student.examFeesSA1;
          examFeesSA2 = student.examFeesSA2;
          reportCard = student.reportCard;
          payments = updatedPayments;
        };
        students.add(studentId, updatedStudent);
        payment.id;
      };
    };
  };

  // Transport Student Functions
  public shared ({ caller }) func addTransportStudent(
    name : Text,
    fatherName : Text,
    contactNumber : Text,
    transportOption : TransportOption,
    monthlyFee : Float
  ) : async Nat {
    let transportStudent = {
      id = nextTransportId;
      name;
      fatherName;
      contactNumber;
      transportOption;
      monthlyFee;
      isActive = true;
      monthlyPayments = [];
    };
    transportStudents.add(nextTransportId, transportStudent);
    nextTransportId += 1;
    transportStudent.id;
  };

  public shared ({ caller }) func updateTransportStudent(
    id : Nat,
    name : Text,
    fatherName : Text,
    contactNumber : Text,
    transportOption : TransportOption,
    monthlyFee : Float
  ) : async () {
    switch (transportStudents.get(id)) {
      case (null) { Runtime.trap("Transport student not found") };
      case (?existing) {
        let updatedStudent = {
          id;
          name;
          fatherName;
          contactNumber;
          transportOption;
          monthlyFee;
          isActive = existing.isActive;
          monthlyPayments = existing.monthlyPayments;
        };
        transportStudents.add(id, updatedStudent);
      };
    };
  };

  public shared ({ caller }) func deleteTransportStudent(id : Nat) : async () {
    transportStudents.remove(id);
  };

  public shared ({ caller }) func markTransportFeePaid(studentId : Nat, month : Nat, year : Nat) : async () {
    switch (transportStudents.get(studentId)) {
      case (null) { Runtime.trap("Transport student not found") };
      case (?student) {
        let payment = {
          id = nextTransportPaymentId;
          studentId;
          month;
          year;
          paid = true;
        };
        nextTransportPaymentId += 1;
        let updatedPayments = student.monthlyPayments.concat([payment]);
        let updatedStudent = {
          id = student.id;
          name = student.name;
          fatherName = student.fatherName;
          contactNumber = student.contactNumber;
          transportOption = student.transportOption;
          monthlyFee = student.monthlyFee;
          isActive = student.isActive;
          monthlyPayments = updatedPayments;
        };
        transportStudents.add(studentId, updatedStudent);
      };
    };
  };

  // Report Card Functions
  public shared ({ caller }) func saveOrUpdateReportCard(
    studentId : Nat,
    subjects : [Text],
    columns : [Text],
    marksEntries : [[Float]]
  ) : async () {
    switch (students.get(studentId)) {
      case (null) { Runtime.trap("Student not found") };
      case (?student) {
        let reportCard = {
          studentId;
          subjects;
          columns;
          marksEntries;
        };
        let updatedStudent = {
          id = student.id;
          name = student.name;
          studentClass = student.studentClass;
          section = student.section;
          fatherName = student.fatherName;
          motherName = student.motherName;
          contactNumber = student.contactNumber;
          totalFee = student.totalFee;
          feePaymentCategory = student.feePaymentCategory;
          discountAmount = student.discountAmount;
          finalFee = student.finalFee;
          examFeesSA1 = student.examFeesSA1;
          examFeesSA2 = student.examFeesSA2;
          reportCard = ?reportCard;
          payments = student.payments;
        };
        students.add(studentId, updatedStudent);
      };
    };
  };

  public query ({ caller }) func getReportCard(studentId : Nat) : async ?ReportCard {
    switch (students.get(studentId)) {
      case (null) { null };
      case (?student) { student.reportCard };
    };
  };

  public query ({ caller }) func getUnpaidTransportStudents(month : Nat, year : Nat) : async [TransportStudent] {
    transportStudents.values().toArray().sort(func(a : TransportStudent, b : TransportStudent) : Order.Order { Nat.compare(a.id, b.id) });
  };

  // Student Extras Functions
  public shared ({ caller }) func setStudentExtras(studentId : Nat, dateOfBirth : Text, aadharNo : Text, admissionNo : Text) : async () {
    let extras : StudentExtras = {
      studentId;
      dateOfBirth;
      aadharNo;
      admissionNo;
    };
    studentExtras.add(studentId, extras);
  };

  public query ({ caller }) func getStudentExtras(studentId : Nat) : async ?StudentExtras {
    studentExtras.get(studentId);
  };

  public query ({ caller }) func getAllStudentExtras() : async [StudentExtras] {
    studentExtras.values().toArray().sort(func(a : StudentExtras, b : StudentExtras) : Order.Order { Nat.compare(a.studentId, b.studentId) });
  };
};

