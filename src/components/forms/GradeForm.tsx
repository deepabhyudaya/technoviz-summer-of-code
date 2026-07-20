"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { gradeSchema, GradeSchema } from "@/lib/formValidationSchemas";
import { createGrade, updateGrade } from "@/lib/actions";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const GradeForm = ({
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
  } = useForm<GradeSchema>({
    resolver: zodResolver(gradeSchema),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createGrade : updateGrade;
      const result = await action({ success: false, error: false }, formData);
      if (result.success) {
        toast(`Year has been ${type === "create" ? "created" : "updated"}!`);
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

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new year" : "Update the year"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Year Level (1-12)"
          name="level"
          defaultValue={data?.level}
          register={register}
          error={errors?.level}
          type="number"
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
      </div>
      {error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button
        disabled={loading}
        className="bg-primary text-primary-foreground p-2 rounded-md disabled:opacity-60"
      >
        {loading ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default GradeForm;
