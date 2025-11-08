import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat64 "mo:base/Nat64";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Timer "mo:base/Timer";

module {
  let NS_PER_SECOND : Nat64 = 1_000_000_000;
  public type Schedule = {
    vaultId : Nat64;
    owner : Principal;
    nextDue : Int;
    intervalNs : Nat64;
  };

  public type HeartbeatTrackerActor = actor class HeartbeatTracker(
    vaultMgr : Principal,
  ) = this {
    stable var schedules : [Schedule] = [];
    var timerId : ?Timer.TimerId = null;

    private func vaultActor() : VaultMgrPortal {
      actor (Principal.toText(vaultMgr)) : VaultMgrPortal;
    };

    private func secondsNow() : Int = Time.now() / 1_000_000_000;

    private func normalize(schedule : Schedule, now : Int) : Schedule {
      if (schedule.nextDue < now) {
        {
          vaultId = schedule.vaultId;
          owner = schedule.owner;
          nextDue = now;
          intervalNs = schedule.intervalNs;
        };
      } else {
        schedule;
      };
    };

    private func nsToSeconds(ns : Nat64) : Int =
      Int.fromNat(Nat64.toNat(ns / NS_PER_SECOND));

    private func scheduleTimer() {
      let now = secondsNow();
      var soonest : ?Int = null;
      for (schedule in schedules.vals()) {
        let normalized = normalize(schedule, now);
        if (normalized.nextDue <= now) {
          soonest := ?now;
          break;
        };
        switch (soonest) {
          case null { soonest := ?normalized.nextDue };
          case (?current) {
            if (normalized.nextDue < current) {
              soonest := ?normalized.nextDue;
            };
          };
        };
      };
      switch (timerId) {
        case (?id) { Timer.cancelTimer(id) };
        case null {};
      };
      switch (soonest) {
        case (?dueSeconds) {
          let deltaSeconds = dueSeconds - now;
          let delay = if (deltaSeconds <= 0) { 0 } else { deltaSeconds };
          let delayNat : Nat = Int.abs(delay);
          let nsDelay : Nat64 = Nat64.fromNat(delayNat) * NS_PER_SECOND;
          timerId := ?Timer.setTimer(
            #nanoseconds nsDelay,
            func() : async () { await tick() },
          );
        };
        case null { timerId := null };
      };
    };

    private func updateSchedule(entry : Schedule) {
      let buffer = Buffer.Buffer<Schedule>(Array.size(schedules));
      var replaced = false;
      for (item in schedules.vals()) {
        if (item.vaultId == entry.vaultId) {
          buffer.add(entry);
          replaced := true;
        } else {
          buffer.add(item);
        };
      };
      if (not replaced) {
        buffer.add(entry);
      };
      schedules := Buffer.toArray(buffer);
    };

    private func extendSchedule(entry : Schedule) : Schedule {
      let stepSeconds = nsToSeconds(entry.intervalNs);
      {
        vaultId = entry.vaultId;
        owner = entry.owner;
        nextDue = secondsNow() + stepSeconds;
        intervalNs = entry.intervalNs;
      };
    };

    private func dueSchedules(now : Int) : [Schedule] {
      Array.filter<Schedule>(
        schedules,
        func(schedule) = schedule.nextDue <= now,
      );
    };

    private func persistSchedules(newSchedules : [Schedule]) {
      schedules := newSchedules;
    };

    private func rollForward(now : Int) : [Schedule] {
      let buffer = Buffer.Buffer<Schedule>(Array.size(schedules));
      for (schedule in schedules.vals()) {
        if (schedule.nextDue <= now) {
          buffer.add(extendSchedule(schedule));
        } else {
          buffer.add(schedule);
        };
      };
      Buffer.toArray(buffer);
    };

    private func recompute(now : Int) {
      schedules := rollForward(now);
      scheduleTimer();
    };

    private func ensureOwnerMatch(owner : Principal, schedule : Schedule) {
      if (owner != schedule.owner) {
        Debug.trap("OWNER_MISMATCH");
      };
    };

    public shared ({ caller }) func register_vault(payload : {
      vault_id : Nat64;
      owner : Principal;
      next_due : Int;
      interval_ns : Nat64;
    }) : async () {
      let existing = Array.find<Schedule>(
        schedules,
        func(item) = item.vaultId == payload.vault_id,
      );
      switch (existing) {
        case (?entry) { ensureOwnerMatch(payload.owner, entry) };
        case null {};
      };

      let normalized : Schedule = {
        vaultId = payload.vault_id;
        owner = payload.owner;
        nextDue = payload.next_due;
        intervalNs = payload.interval_ns;
      };

      updateSchedule(normalized);
      scheduleTimer();
    };

    private func markMissed(schedule : Schedule) : async () {
      ignore await vaultActor().heartbeat_missed(schedule.vaultId);
    };

    private func tick() : async () {
      let now = secondsNow();
      let due = dueSchedules(now);
      for (entry in due.vals()) {
        await markMissed(entry);
      };
      recompute(now);
    };
  };

  public type VaultMgrPortal = actor {
    heartbeat_missed : (Nat64) -> async {
      id : Nat64;
      name : Text;
      status : {
        #Deployed;
        #Active;
        #InheritancePending;
        #Executed;
      };
      bitcoinAddress : Text;
      guardianCount : Nat;
      guardianThreshold : Nat;
      heartbeatDueInSeconds : Int;
    };
  };
};
