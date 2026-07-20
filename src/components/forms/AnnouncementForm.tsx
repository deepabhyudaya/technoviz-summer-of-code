"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useState } from "react";
import { announcementSchema, AnnouncementSchema } from "@/lib/formValidationSchemas";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const AnnouncementForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementSchema>({
    resolver: zodResolver(announcementSchema),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createAnnouncement : updateAnnouncement;
      const result = await action({ success: false, error: false }, formData);
      if (result.success) {
        toast(`Announcement has been ${type === "create" ? "created" : "updated"}!`);
        setOpen(false);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  });

  const { classes } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new announcement" : "Update the announcement"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
        <InputField
          label="Date"
          name="date"
          defaultValue={data?.date?.toISOString().split("T")[0]}
          register={register}
          error={errors?.date}
          type="date"
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs font-medium text-muted-foreground">Branch (Optional)</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("classId")}
            defaultValue={data?.classId || ""}
          >
            <option value="">General (All Branches)</option>
            {classes.map((classItem: { id: number; name: string }) => (
              <option value={classItem.id} key={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea
          className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
          {...register("description")}
          defaultValue={data?.description}
          rows={4}
        />
        {errors.description?.message && (
          <p className="text-xs text-red-400">
            {errors.description.message.toString()}
          </p>
        )}
      </div>

      {error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button disabled={loading} className="bg-primary text-primary-foreground p-2 rounded-md disabled:opacity-60">
        {loading ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default AnnouncementForm;
